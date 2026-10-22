import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm, symlink, link, mkdir, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { NotesGrant, NOTES_LIMITS } from './notes';

let root: string;
const signal = new AbortController().signal;
beforeEach(async () => { root = await mkdtemp(path.join(tmpdir(), 'agentnest-notes-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); await rm(`${root}-old`, { recursive: true, force: true }); });
const note = (name: string, text: string | Uint8Array) => writeFile(path.join(root, name), text);

describe('read-only directory grant', () => {
  it('rejects changes and newly added Markdown after metadata approval', async () => {
    await note('public.md', 'safe'); const approval = await (await NotesGrant.create(root)).approve();
    expect(approval.files.map((file) => file.path)).toEqual(['public.md']);
    await note('public.md', 'changed');
    await expect((await NotesGrant.fromApproval(approval)).read('public.md', signal)).rejects.toMatchObject({ code: 'INPUT_CHANGED' });
    await note('new.md', 'unapproved'); await expect(NotesGrant.fromApproval(approval)).rejects.toMatchObject({ code: 'INPUT_CHANGED' });
  });
  it('reads only approved flat Markdown and returns exact source evidence', async () => {
    await note('public.md', '# Public note'); await note('ignored.txt', 'ignore');
    await mkdir(path.join(root, 'nested')); await writeFile(path.join(root, 'nested', 'hidden.md'), 'hidden');
    const grant = await NotesGrant.create(root);
    expect(grant.names).toEqual(['public.md']);
    expect(await grant.read('public.md', signal)).toEqual({ text: '# Public note', source: { path: 'public.md', bytes: 13, sha256: createHash('sha256').update('# Public note').digest('hex') } });
  });
  it.each(['../outside.md', '/etc/private.md', 'C:\\private.md', 'nested/hidden.md', 'nested\\hidden.md', 'unknown.md'])('rejects unapproved path %s', async (name) => {
    await note('public.md', 'safe'); const grant = await NotesGrant.create(root);
    await expect(grant.read(name, signal)).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
  it('rejects hard links and directories substituted for an approved file', async () => {
    await note('public.md', 'safe'); const grant = await NotesGrant.create(root);
    await link(path.join(root, 'public.md'), path.join(root, 'alias.md'));
    await expect(grant.read('public.md', signal)).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    await rm(path.join(root, 'public.md')); await mkdir(path.join(root, 'public.md'));
    await expect(grant.read('public.md', signal)).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
  it('rejects a symlink substituted after granting access', async (context) => {
    await note('public.md', 'safe'); await note('target.txt', 'private'); const grant = await NotesGrant.create(root);
    await rm(path.join(root, 'public.md'));
    try { await symlink(path.join(root, 'target.txt'), path.join(root, 'public.md')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'EPERM') { context.skip(); return; } throw error; }
    await expect(grant.read('public.md', signal)).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
  it('rejects a replaced root and changed content on repeated reads', async () => {
    await note('public.md', 'safe'); const grant = await NotesGrant.create(root);
    await grant.read('public.md', signal); await note('public.md', 'changed');
    await expect(grant.read('public.md', signal)).rejects.toMatchObject({ code: 'INPUT_CHANGED' });
    await rename(root, `${root}-old`); await mkdir(root); await note('public.md', 'other');
    await expect(grant.read('public.md', signal)).rejects.toMatchObject({ code: 'INPUT_CHANGED' });
  });
  it('enforces file, aggregate-byte, file-count and tool-call limits', async () => {
    await note('large.md', 'a'.repeat(NOTES_LIMITS.fileBytes + 1));
    await expect((await NotesGrant.create(root)).read('large.md', signal)).rejects.toMatchObject({ code: 'LIMIT_EXCEEDED' });
    await note('large.md', 'a'.repeat(NOTES_LIMITS.fileBytes));
    const grant = await NotesGrant.create(root);
    await grant.read('large.md', signal); await grant.read('large.md', signal);
    await expect(grant.read('large.md', signal)).rejects.toMatchObject({ code: 'LIMIT_EXCEEDED' });
    await note('large.md', 'small'); const calls = await NotesGrant.create(root);
    for (let n = 0; n < NOTES_LIMITS.calls; n++) await calls.read('large.md', signal);
    await expect(calls.read('large.md', signal)).rejects.toMatchObject({ code: 'LIMIT_EXCEEDED' });
    for (let n = 0; n < NOTES_LIMITS.files; n++) await note(`${n}.md`, 'small');
    await expect(NotesGrant.create(root)).rejects.toMatchObject({ code: 'LIMIT_EXCEEDED' });
  });
  it('rejects invalid UTF-8 and observes cancellation before a read', async () => {
    await note('public.md', new Uint8Array([0xff])); const grant = await NotesGrant.create(root);
    await expect(grant.read('public.md', signal)).rejects.toMatchObject({ code: 'INVALID_TEXT' });
    await expect(grant.read('public.md', AbortSignal.abort())).rejects.toThrow();
  });
  it('bounds directory enumeration before collecting an unbounded listing', async () => {
    await note('public.md', 'safe');
    for (let n = 0; n < NOTES_LIMITS.entries; n++) await note(`${n}.txt`, 'ignored');
    await expect(NotesGrant.create(root)).rejects.toMatchObject({ code: 'LIMIT_EXCEEDED' });
  });
});
