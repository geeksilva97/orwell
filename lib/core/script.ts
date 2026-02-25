import assert from 'node:assert';

export class Script {
  readonly id: string;
  readonly path: string;
  content: string;

  constructor({ id, content, path }: { id: string; content: string; path: string }) {
    assert(id);
    assert(path);

    this.id = id;
    this.path = path;
    this.content = content;
  }

  setContent(content: string): void {
    this.content = content;
  }

  static create(params: { id: string; content: string; path: string }): Script {
    return new Script(params);
  }
}
