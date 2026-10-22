import { constants } from 'node:fs';
import { lstat, open, opendir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { NoteSource } from '@agentnest/core';
import { RunFailure } from './failure';

export const NOTES_LIMITS = { entries: 64, files: 4, fileBytes: 8 * 1024, totalBytes: 16 * 1024, calls: 4 } as const;
const safeName = (name: string) => /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}\.md$/.test(name);
interface ApprovedFile { readonly path: string; readonly bytes: number; readonly device: number; readonly inode: number; readonly modified: number; readonly changed: number }
/** Backend-only permission snapshot. Never sent to the renderer. No content is read. */
export interface NotesApproval { readonly root: string; readonly device: number; readonly inode: number; readonly files: readonly ApprovedFile[] }

/** Flat, explicitly selected directory. No recursive paths or model-selected roots. */
export class NotesGrant {
  private calls = 0;
  private reservedBytes = 0;
  private readonly readHashes = new Map<string, string>();
  private approval: NotesApproval | undefined;
  private constructor(readonly root: string, readonly names: readonly string[], private readonly device: number, private readonly inode: number) {}

  static async create(input: string): Promise<NotesGrant> {
    try {
      const root = await realpath(input);
      const info = await lstat(root);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new RunFailure('NOTES_UNAVAILABLE');
      const names: string[] = []; let entries = 0;
      const directory = await opendir(root);
      for await (const entry of directory) {
        if (++entries > NOTES_LIMITS.entries) throw new RunFailure('LIMIT_EXCEEDED');
        if (entry.isFile() && !entry.isSymbolicLink() && safeName(entry.name)) names.push(entry.name);
      }
      names.sort();
      if (!names.length || names.length > NOTES_LIMITS.files) throw new RunFailure('LIMIT_EXCEEDED');
      return new NotesGrant(root, names, info.dev, info.ino);
    } catch (error) { if (error instanceof RunFailure) throw error; throw new RunFailure('NOTES_UNAVAILABLE'); }
  }

  private async checkRoot(): Promise<void> {
    const info = await lstat(this.root);
    if (!info.isDirectory() || info.isSymbolicLink() || info.dev !== this.device || info.ino !== this.inode
      || await realpath(this.root) !== this.root) throw new RunFailure('INPUT_CHANGED');
  }

  async approve(): Promise<NotesApproval> {
    await this.checkRoot();
    const files: ApprovedFile[] = []; let total = 0;
    for (const name of this.names) {
      const candidate = path.join(this.root, name); const info = await lstat(candidate);
      if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || await realpath(candidate) !== candidate) throw new RunFailure('PERMISSION_DENIED');
      if (info.size > NOTES_LIMITS.fileBytes || (total += info.size) > NOTES_LIMITS.totalBytes) throw new RunFailure('LIMIT_EXCEEDED');
      files.push({ path: name, bytes: info.size, device: info.dev, inode: info.ino, modified: info.mtimeMs, changed: info.ctimeMs });
    }
    await this.checkRoot();
    return { root: this.root, device: this.device, inode: this.inode, files };
  }

  static async fromApproval(approval: NotesApproval): Promise<NotesGrant> {
    const grant = await NotesGrant.create(approval.root);
    if (grant.root !== approval.root || grant.device !== approval.device || grant.inode !== approval.inode
      || grant.names.length !== approval.files.length || grant.names.some((name, index) => name !== approval.files[index]?.path)) throw new RunFailure('INPUT_CHANGED');
    grant.approval = approval;
    return grant;
  }

  async read(name: string, signal: AbortSignal): Promise<{ text: string; source: NoteSource }> {
    signal.throwIfAborted();
    if (!safeName(name) || !this.names.includes(name)) throw new RunFailure('PERMISSION_DENIED');
    if (++this.calls > NOTES_LIMITS.calls) throw new RunFailure('LIMIT_EXCEEDED');
    try {
      await this.checkRoot();
      const candidate = path.join(this.root, name);
      const before = await lstat(candidate);
      const approved = this.approval?.files.find((file) => file.path === name);
      if (this.approval && (!approved || before.dev !== approved.device || before.ino !== approved.inode || before.size !== approved.bytes || before.mtimeMs !== approved.modified || before.ctimeMs !== approved.changed)) throw new RunFailure('INPUT_CHANGED');
      if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || await realpath(candidate) !== candidate) throw new RunFailure('PERMISSION_DENIED');
      if (before.size > NOTES_LIMITS.fileBytes || this.reservedBytes + before.size > NOTES_LIMITS.totalBytes) throw new RunFailure('LIMIT_EXCEEDED');
      this.reservedBytes += before.size;
      const file = await open(candidate, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
      try {
        const opened = await file.stat();
        if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) throw new RunFailure('INPUT_CHANGED');
        const buffer = Buffer.alloc(NOTES_LIMITS.fileBytes + 1); let bytes = 0;
        while (bytes < buffer.length) {
          signal.throwIfAborted();
          const part = await file.read(buffer, bytes, buffer.length - bytes, bytes);
          if (!part.bytesRead) break;
          bytes += part.bytesRead;
        }
        if (bytes > NOTES_LIMITS.fileBytes) throw new RunFailure('LIMIT_EXCEEDED');
        const after = await file.stat();
        await this.checkRoot(); signal.throwIfAborted();
        if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs || bytes !== before.size) throw new RunFailure('INPUT_CHANGED');
        const content = buffer.subarray(0, bytes);
        let text: string;
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(content); } catch { throw new RunFailure('INVALID_TEXT'); }
        const sha256 = createHash('sha256').update(content).digest('hex');
        const previous = this.readHashes.get(name);
        if (previous && previous !== sha256) throw new RunFailure('INPUT_CHANGED');
        this.readHashes.set(name, sha256);
        return { text, source: { path: name, bytes, sha256 } };
      } finally { await file.close(); }
    } catch (error) {
      if (error instanceof RunFailure || signal.aborted) throw error;
      throw new RunFailure('PERMISSION_DENIED');
    }
  }
}
