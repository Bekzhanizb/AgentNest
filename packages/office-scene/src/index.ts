import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
// Despite its name, this official Pixi entry installs non-eval CSP-safe sync code.
import 'pixi.js/unsafe-eval';
import type { AgentViewModel } from '@agentnest/core';
import { characterArt, DESKS, labelArt, officeArt, ROOM_HEIGHT, ROOM_WIDTH } from './art';
import { clampZoom, INITIAL_CAMERA } from './camera';
import type { OfficeCamera } from './camera';
export { clampZoom, INITIAL_CAMERA } from './camera';
export type { OfficeCamera } from './camera';

/** Presentation only: consumes snapshots; never creates or dispatches AgentEvents. */
export class OfficeScene {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly cast = new Container();
  private readonly lamp = new Graphics();
  private readonly ownedTextures = new Set<Texture>();
  private characterTextures: Texture[] = [];
  private bodies: { sprite: Sprite; y: number }[] = [];
  private agents: readonly AgentViewModel[] = [];
  private width = 1;
  private height = 1;
  private scale = 1;
  private camera: OfficeCamera = INITIAL_CAMERA;
  private elapsed = 0;
  private destroyed = false;

  static async create(): Promise<OfficeScene> {
    const scene = new OfficeScene();
    try {
      await scene.app.init({ width: 1, height: 1, preference: 'webgl', antialias: false, backgroundAlpha: 0, autoStart: false, resolution: 1 });
      scene.app.stage.eventMode = 'none';
      const room = new Sprite(scene.texture(officeArt()));
      scene.world.addChild(room);
      scene.lamp.rect(55, 89, 33, 24).fill({ color: 0xffe2a3, alpha: .09 });
      scene.lamp.rect(426, 78, 30, 40).fill({ color: 0xffe2a3, alpha: .08 });
      scene.world.addChild(scene.lamp, scene.cast);
      scene.app.stage.addChild(scene.world);
      scene.app.ticker.maxFPS = 12;
      scene.app.ticker.add((ticker) => {
        scene.elapsed += ticker.deltaMS / 1000;
        scene.lamp.alpha = .8 + Math.sin(scene.elapsed * .8) * .15;
        scene.bodies.forEach(({ sprite, y }, index) => { sprite.y = y + Math.round(Math.sin(scene.elapsed * 1.2 + index) * .6); });
      });
      return scene;
    } catch (error) {
      // init can fail before a renderer exists; do not mask the useful fallback.
      if (scene.app.renderer) scene.destroy();
      throw error;
    }
  }

  get canvas(): HTMLCanvasElement { return this.app.canvas; }

  private texture(canvas: HTMLCanvasElement): Texture {
    const texture = Texture.from(canvas);
    texture.source.scaleMode = 'nearest';
    this.ownedTextures.add(texture);
    return texture;
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width); this.height = Math.max(1, height);
    this.app.renderer.resize(this.width, this.height);
    this.setCamera(this.camera);
  }

  setCamera(camera: OfficeCamera): void {
    this.camera = camera;
    this.scale = Math.min(this.width / (ROOM_WIDTH + 16), this.height / (ROOM_HEIGHT + 16)) * clampZoom(camera.zoom);
    this.world.scale.set(this.scale);
    const maxX = Math.max(0, (ROOM_WIDTH * this.scale - this.width) / 2) + this.width * .25;
    const maxY = Math.max(0, (ROOM_HEIGHT * this.scale - this.height) / 2) + this.height * .25;
    this.world.position.set(
      (this.width - ROOM_WIDTH * this.scale) / 2 + Math.max(-maxX, Math.min(maxX, camera.x)),
      (this.height - ROOM_HEIGHT * this.scale) / 2 + Math.max(-maxY, Math.min(maxY, camera.y)),
    );
    this.app.render();
  }

  update(agents: readonly AgentViewModel[], selectedId: string | null, motion: boolean): void {
    this.agents = agents;
    this.cast.removeChildren().forEach((child) => child.destroy({ children: true }));
    for (const texture of this.characterTextures) { this.ownedTextures.delete(texture); texture.destroy(true); }
    this.characterTextures = []; this.bodies = [];
    for (const agent of agents) {
      const desk = DESKS[agent.desk];
      const x = desk.x + 27; const y = desk.y + 36;
      if (agent.id === selectedId) {
        const selection = new Graphics().rect(x - 3, y - 3, 34, 38).stroke({ color: 0xffedbd, width: 2 });
        this.cast.addChild(selection);
      }
      const texture = this.texture(characterArt(agent.appearance));
      // Canvas labels retain their event origin; the DOM provides full labels.
      const label = this.texture(labelArt(agent.name, agent.status, agent.origin));
      this.characterTextures.push(texture, label);
      const body = new Sprite(texture); body.position.set(x, y);
      this.bodies.push({ sprite: body, y }); this.cast.addChild(body);
      const badge = new Sprite(label); badge.position.set(desk.x + 42 - label.width / 2, desk.y + 72);
      this.cast.addChild(badge);
    }
    if (motion) this.app.start();
    else { this.app.stop(); this.lamp.alpha = 1; }
    this.app.render();
  }

  pick(x: number, y: number): string | null {
    const worldX = (x - this.world.x) / this.scale;
    const worldY = (y - this.world.y) / this.scale;
    for (const agent of this.agents) {
      const desk = DESKS[agent.desk];
      if (worldX >= desk.x + 21 && worldX <= desk.x + 62 && worldY >= desk.y + 29 && worldY <= desk.y + 99) return agent.id;
    }
    return null;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.app.stop(); this.app.destroy(true, { children: true });
    for (const texture of this.ownedTextures) texture.destroy(true);
    this.ownedTextures.clear();
  }
}
