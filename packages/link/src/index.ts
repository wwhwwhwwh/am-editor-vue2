import {
  $,
  NodeInterface,
  InlinePlugin,
  isEngine,
  PluginOptions,
} from "@aomao/engine";
import type MarkdownIt from 'markdown-it';
import Toolbar from "./toolbar";
import locales from "./locales";

import "./index.css";

export interface LinkOptions extends PluginOptions {
  hotkey?: string | Array<string>;
  markdown?: string;
}
export default class<
  T extends LinkOptions = LinkOptions
> extends InlinePlugin<T> {
  private toolbar?: Toolbar;

  static get pluginName() {
    return "link";
  }

  attributes = {
    target: "@var0",
    href: "@var1",
  };

  variable = {
    "@var0": ["_blank", "_parent", "_top", "_self"],
    "@var1": {
      required: true,
      value: "*",
    },
  };

  tagName = "a";

  markdown =
    this.options.markdown === undefined
      ? "([^!]|^)\\[(.+?)\\]\\(\\s*([\\S]+?)\\s*\\)$"
      : this.options.markdown;

  init() {
    super.init();
    
    const editor = this.editor;
    if (isEngine(editor)) {
      this.toolbar = new Toolbar(editor, {
        onConfirm: this.options.onConfirm,
      });
      this.editor.on('markdown-it', this.markdownIt);
    }
    editor.on("paste:each", this.pasteHtml);
    editor.on("parse:html", this.parseHtml);
    editor.on("select", this.bindQuery);
    editor.language.add(locales);
  }

  hotkey() {
    return this.options.hotkey || { key: "mod+k", args: ["_blank"] };
  }

  execute(...args: any[]) {
    if (!isEngine(this.editor)) return;
    const { inline, change } = this.editor;
    if (!this.queryState()) {
      const inlineNode = $(`<${this.tagName} />`);
      this.setStyle(inlineNode, ...args);
      this.setAttributes(inlineNode, ...args);
      const text = args.length > 2 ? args[2] : "";

      if (text) {
        inlineNode.text(text);
        inline.insert(inlineNode);
      } else {
        inline.wrap(inlineNode);
      }
      const range = change.range.get();
      if (!range.collapsed && change.inlines.length > 0) {
        this.toolbar?.show(change.inlines[0]);
      }
    } else {
      const inlineNode = change.inlines.find((node) => this.isSelf(node));
      if (inlineNode && inlineNode.length > 0) {
        inline.unwrap(inlineNode);
      }
    }
  }

  bindQuery = () => {
    this.query();
  };

  query = () => {
    if (!isEngine(this.editor)) return;
    const { change } = this.editor;
    const inlineNode = change.inlines.find((node) => this.isSelf(node));
    this.toolbar?.hide(inlineNode);
    if (inlineNode && inlineNode.length > 0 && !inlineNode.isCard()) {
      const range = change.range.get();
      if (
        range.collapsed ||
        (inlineNode.contains(range.startNode) &&
          inlineNode.contains(range.endNode))
      ) {
        this.toolbar?.show(inlineNode);
        return true;
      } else {
        this.toolbar?.hide();
      }
    }
    return false;
  };

  queryState() {
    return this.query();
  }
  markdownIt = (mardown: MarkdownIt) => {
		if (this.options.markdown !== false) {
			mardown.enable('link');
			mardown.enable('linkify');
		}
	};

  parseHtml = (root: NodeInterface) => {
    root.find(this.tagName).css({
      "font-family": "monospace",
      "font-size": "inherit",
      "background-color": "rgba(0,0,0,.06)",
      padding: "0 2px",
      border: "1px solid rgba(0,0,0,.08)",
      "border-radius": "2px 2px",
      "line-height": "inherit",
      "overflow-wrap": "break-word",
      "text-indent": "0",
    });
  };

  pasteHtml = (child: NodeInterface) => {
    if (child.isText()) {
      const text = child.text();
      const { node, inline } = this.editor;
      if (
        /^https?:\/\/\S+$/.test(text.toLowerCase().trim()) &&
        inline.closest(child).equal(child)
      ) {
        const newNode = node.wrap(
          child,
          $(`<${this.tagName} target="_blank" href="${text}"></a>`)
        );
        inline.repairCursor(newNode);
        return false;
      }
    }
    return true;
  };

  destroy(): void {
    super.destroy();
    this.editor.off("paste:each", this.pasteHtml);
    this.editor.off("parse:html", this.parseHtml);
    this.editor.off("select", this.bindQuery);
  }
}
