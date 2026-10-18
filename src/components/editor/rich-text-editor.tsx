"use client";
import * as React from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Code, Code2, Heading2, Heading3, Image as ImageIcon, Italic,
  Link2, List, ListOrdered, Minus, Quote, Redo2, Strikethrough, Underline as UnderlineIcon, Undo2, Unlink, Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { MediaPicker } from "./media-picker";

function ToolButton({ onClick, active, disabled, label, children }: { onClick: () => void; active?: boolean; disabled?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} disabled={disabled} title={label} aria-label={label} aria-pressed={active}
      className={cn("flex size-8 items-center justify-center rounded-md text-navy-700 transition-colors hover:bg-surface hover:text-navy-900 disabled:opacity-30 [&_svg]:size-4",
        active && "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary")}>
      {children}
    </button>
  );
}
const Divider = () => <span className="mx-1 h-5 w-px bg-border" aria-hidden />;

function blockValue(editor: Editor) {
  for (const l of [1, 2, 3, 4] as const) if (editor.isActive("heading", { level: l })) return `h${l}`;
  return "p";
}

export function RichTextEditor({ value, onChange, canUpload, placeholder = "Start writing your story…" }: {
  value: string; onChange: (html: string, text: string) => void; canUpload: boolean; placeholder?: string;
}) {
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [videoOpen, setVideoOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: null, target: null } }),
      Image.configure({ HTMLAttributes: { loading: "lazy" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Youtube.configure({ nocookie: true, modestBranding: true, width: 640, height: 360 }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: { class: "tiptap prose prose-slate max-w-none px-5 py-4 sm:px-8 prose-headings:text-navy-900 prose-a:text-primary", "aria-label": "Post content", role: "textbox", "aria-multiline": "true" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML(), editor.getText()),
    onSelectionUpdate: () => force(),
    onTransaction: () => force(),
  });

  // Report initial text so word count is correct on load.
  React.useEffect(() => {
    if (editor) onChange(editor.getHTML(), editor.getText());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) {
    return <div className="min-h-[480px] animate-pulse rounded-b-xl bg-surface/50" aria-busy="true" />;
  }

  const c = () => editor.chain().focus();

  return (
    <div>
      <div className="z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-white/95 px-2 py-1.5 backdrop-blur xl:sticky xl:top-[117px]" role="toolbar" aria-label="Formatting">
        <Select
          value={blockValue(editor)}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "p") c().setParagraph().run();
            else c().toggleHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 | 4 }).run();
          }}
          className="mr-1 h-8 w-32 text-xs shadow-none"
          aria-label="Text style"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
        </Select>
        <ToolButton label="Bold (Ctrl+B)" active={editor.isActive("bold")} onClick={() => c().toggleBold().run()}><Bold /></ToolButton>
        <ToolButton label="Italic (Ctrl+I)" active={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}><Italic /></ToolButton>
        <ToolButton label="Underline (Ctrl+U)" active={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()}><UnderlineIcon /></ToolButton>
        <ToolButton label="Strikethrough" active={editor.isActive("strike")} onClick={() => c().toggleStrike().run()}><Strikethrough /></ToolButton>
        <ToolButton label="Inline code" active={editor.isActive("code")} onClick={() => c().toggleCode().run()}><Code /></ToolButton>
        <Divider />
        <ToolButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 /></ToolButton>
        <ToolButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 /></ToolButton>
        <ToolButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}><List /></ToolButton>
        <ToolButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}><ListOrdered /></ToolButton>
        <ToolButton label="Blockquote" active={editor.isActive("blockquote")} onClick={() => c().toggleBlockquote().run()}><Quote /></ToolButton>
        <ToolButton label="Code block" active={editor.isActive("codeBlock")} onClick={() => c().toggleCodeBlock().run()}><Code2 /></ToolButton>
        <ToolButton label="Divider" onClick={() => c().setHorizontalRule().run()}><Minus /></ToolButton>
        <Divider />
        <ToolButton label="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => c().setTextAlign("left").run()}><AlignLeft /></ToolButton>
        <ToolButton label="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => c().setTextAlign("center").run()}><AlignCenter /></ToolButton>
        <ToolButton label="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => c().setTextAlign("right").run()}><AlignRight /></ToolButton>
        <ToolButton label="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => c().setTextAlign("justify").run()}><AlignJustify /></ToolButton>
        <Divider />
        <ToolButton label="Insert or edit link" active={editor.isActive("link")} onClick={() => setLinkOpen(true)}><Link2 /></ToolButton>
        {editor.isActive("link") && <ToolButton label="Remove link" onClick={() => c().unsetLink().run()}><Unlink /></ToolButton>}
        <ToolButton label="Insert image" onClick={() => setPickerOpen(true)}><ImageIcon /></ToolButton>
        <ToolButton label="Embed video" onClick={() => setVideoOpen(true)}><Video /></ToolButton>
        <span className="ml-auto flex">
          <ToolButton label="Undo (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => c().undo().run()}><Undo2 /></ToolButton>
          <ToolButton label="Redo (Ctrl+Shift+Z)" disabled={!editor.can().redo()} onClick={() => c().redo().run()}><Redo2 /></ToolButton>
        </span>
      </div>
      <EditorContent editor={editor} />

      <LinkDialog open={linkOpen} onOpenChange={setLinkOpen} editor={editor} />
      <VideoDialog open={videoOpen} onOpenChange={setVideoOpen} editor={editor} />
      <MediaPicker open={pickerOpen} onOpenChange={setPickerOpen} canUpload={canUpload} title="Insert image"
        onSelect={(m) => c().setImage({ src: m.url, alt: m.alt ?? "", title: m.caption ?? undefined }).run()} />
    </div>
  );
}

function LinkDialog({ open, onOpenChange, editor }: { open: boolean; onOpenChange: (o: boolean) => void; editor: Editor }) {
  const [url, setUrl] = React.useState("");
  const [newTab, setNewTab] = React.useState(false);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    if (open) {
      const attrs = editor.getAttributes("link");
      setUrl(attrs.href ?? ""); setNewTab(attrs.target === "_blank"); setError("");
    }
  }, [open, editor]);
  const apply = () => {
    const v = url.trim();
    if (!v) { editor.chain().focus().extendMarkRange("link").unsetLink().run(); onOpenChange(false); return; }
    const href = /^(https?:|mailto:|\/|#)/i.test(v) ? v : `https://${v}`;
    if (!/^(https?:\/\/[^\s]+|mailto:[^\s]+|\/[^\s]*|#[^\s]*)$/i.test(href)) { setError("Enter a valid URL."); return; }
    const chain = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain.insertContent({ type: "text", text: v, marks: [{ type: "link", attrs: { href, target: newTab ? "_blank" : null } }] }).run();
    } else {
      chain.setLink({ href, target: newTab ? "_blank" : null }).run();
    }
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Insert link" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); apply(); }}>
          <div className="space-y-4 p-5">
            <Field label="URL" htmlFor="link-url" error={error} hint="Leave empty to remove the link.">
              <Input id="link-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" autoFocus aria-invalid={!!error} />
            </Field>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={newTab} onChange={(e) => setNewTab(e.target.checked)} />Open in a new tab</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Apply</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VideoDialog({ open, onOpenChange, editor }: { open: boolean; onOpenChange: (o: boolean) => void; editor: Editor }) {
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState("");
  React.useEffect(() => { if (open) { setUrl(""); setError(""); } }, [open]);
  const apply = () => {
    const ok = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)[\w-]{6,}/i.test(url.trim());
    if (!ok) { setError("Paste a YouTube video link, e.g. https://www.youtube.com/watch?v=…"); return; }
    editor.chain().focus().setYoutubeVideo({ src: url.trim() }).run();
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Embed a video" description="Embeds use YouTube's privacy-enhanced mode." size="sm">
        <form onSubmit={(e) => { e.preventDefault(); apply(); }}>
          <div className="p-5">
            <Field label="YouTube URL" htmlFor="video-url" error={error}>
              <Input id="video-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" autoFocus aria-invalid={!!error} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Embed</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
