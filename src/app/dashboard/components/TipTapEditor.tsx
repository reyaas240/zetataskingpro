"use client";

import React, { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Node, mergeAttributes } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";

// Custom video extension to handle video embeds in rich text
const VideoExtension = Node.create({
  name: "video",
  group: "block",
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      controls: {
        default: true,
      },
    };
  },

  parseHTML() {
    return [{ tag: "video" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        controls: true,
        style: "max-width: 100%; border-radius: 8px; margin: 8px 0; display: block;",
      }),
    ];
  },
});

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
  placeholder?: string;
}

export default function TipTapEditor({
  content,
  onChange,
  editable = true,
  placeholder = "Start writing a description... Use the toolbar to format, add images, videos or attach files.",
}: TipTapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadType, setUploadType] = useState<"image" | "video" | "file">("image");
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          style: "max-width: 100%; border-radius: 8px; margin: 8px 0;",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      VideoExtension,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Keep content in sync with external updates
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const handleUploadClick = (type: "image" | "video" | "file") => {
    setUploadType(type);
    if (fileInputRef.current) {
      fileInputRef.current.accept =
        type === "image" ? "image/*" : type === "video" ? "video/*" : "*/*";
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleInsertLink = () => {
    const url = window.prompt("Enter URL:");
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        editor.chain().focus();

        if (uploadType === "image") {
          editor.commands.setImage({ src: data.url, alt: data.name });
        } else if (uploadType === "video") {
          editor.commands.insertContent({ type: "video", attrs: { src: data.url } });
        } else {
          editor.commands.insertContent(
            `<a href="${data.url}" target="_blank" rel="noopener noreferrer">📎 ${data.name}</a> `
          );
        }
        onChange(editor.getHTML());
      } else {
        const err = await res.json();
        alert(err.error || "Upload failed");
      }
    } catch {
      alert("Error uploading file");
    } finally {
      setUploading(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="tiptap-editor-container">
      {editable && (
        <div className="tiptap-toolbar">
          {/* ── Text Formatting ── */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`tiptap-btn ${editor.isActive("bold") ? "is-active" : ""}`}
            style={{ fontWeight: "bold" }}
            title="Bold (⌘B)"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`tiptap-btn ${editor.isActive("italic") ? "is-active" : ""}`}
            style={{ fontStyle: "italic" }}
            title="Italic (⌘I)"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className={`tiptap-btn ${editor.isActive("strike") ? "is-active" : ""}`}
            style={{ textDecoration: "line-through" }}
            title="Strikethrough"
          >
            S
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`tiptap-btn ${editor.isActive("code") ? "is-active" : ""}`}
            title="Inline Code"
          >
            {"<>"}
          </button>

          <span className="tiptap-divider" />

          {/* ── Headings ── */}
          {([1, 2, 3] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              className={`tiptap-btn ${editor.isActive("heading", { level }) ? "is-active" : ""}`}
              title={`Heading ${level}`}
            >
              H{level}
            </button>
          ))}

          <span className="tiptap-divider" />

          {/* ── Lists & Blocks ── */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`tiptap-btn ${editor.isActive("bulletList") ? "is-active" : ""}`}
            title="Bullet List"
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`tiptap-btn ${editor.isActive("orderedList") ? "is-active" : ""}`}
            title="Numbered List"
          >
            1. List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`tiptap-btn ${editor.isActive("blockquote") ? "is-active" : ""}`}
            title="Blockquote"
          >
            ❝
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`tiptap-btn ${editor.isActive("codeBlock") ? "is-active" : ""}`}
            title="Code Block"
          >
            {"{ }"}
          </button>

          <span className="tiptap-divider" />

          {/* ── Link ── */}
          <button
            type="button"
            onClick={handleInsertLink}
            className={`tiptap-btn ${editor.isActive("link") ? "is-active" : ""}`}
            title="Insert Link"
          >
            🔗 Link
          </button>

          <span className="tiptap-divider" />

          {/* ── Media & Attachments ── */}
          <button
            type="button"
            onClick={() => handleUploadClick("image")}
            className="tiptap-btn"
            title="Insert Image"
            disabled={uploading}
          >
            🖼️ Image
          </button>
          <button
            type="button"
            onClick={() => handleUploadClick("video")}
            className="tiptap-btn"
            title="Insert Video"
            disabled={uploading}
          >
            🎥 Video
          </button>
          <button
            type="button"
            onClick={() => handleUploadClick("file")}
            className="tiptap-btn"
            title="Insert Attachment"
            disabled={uploading}
          >
            📎 File
          </button>

          {uploading && (
            <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginLeft: 8, display: "flex", alignItems: "center" }}>
              ⏳ Uploading...
            </span>
          )}

          <span className="tiptap-divider" />

          {/* ── History ── */}
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="tiptap-btn"
            title="Undo (⌘Z)"
          >
            ↩ Undo
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="tiptap-btn"
            title="Redo (⌘⇧Z)"
          >
            Redo ↪
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <EditorContent editor={editor} className="tiptap-content" />
    </div>
  );
}
