"use client";

import React, { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Node, mergeAttributes } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";

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

// React component for Image Node View displaying resize handles when selected
const ImageNodeView = ({ node, updateAttributes, selected }: any) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(node.attrs.width || "100%");
  const [height, setHeight] = useState(node.attrs.height || "auto");

  useEffect(() => {
    setWidth(node.attrs.width || "100%");
    setHeight(node.attrs.height || "auto");
  }, [node.attrs.width, node.attrs.height]);

  const alignment = node.attrs.alignment || "center";

  let display = "block";
  let margin = "8px auto";
  let float = "none";

  if (alignment === "left") {
    margin = "8px 12px 8px 0";
    float = "left";
    display = "inline-block";
  } else if (alignment === "right") {
    margin = "8px 0 8px 12px";
    float = "right";
    display = "inline-block";
  }

  // 1. Resize Width Only (Right Handle)
  const handleWidthResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const parentWidth = containerRef.current?.parentElement?.offsetWidth || 1;
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = rect.left;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentWidthPx = moveEvent.clientX - startX;
      let newPct = Math.max(10, Math.min(100, Math.round((currentWidthPx / parentWidth) * 100)));
      setWidth(`${newPct}%`);
    };

    const handleMouseUp = (moveEvent: MouseEvent) => {
      const currentWidthPx = moveEvent.clientX - startX;
      let newPct = Math.max(10, Math.min(100, Math.round((currentWidthPx / parentWidth) * 100)));
      updateAttributes({ width: `${newPct}%` });
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // 2. Resize Height Only (Bottom Handle)
  const handleHeightResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startY = rect.top;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentHeightPx = moveEvent.clientY - startY;
      let newHeight = Math.max(50, Math.round(currentHeightPx));
      setHeight(`${newHeight}px`);
    };

    const handleMouseUp = (moveEvent: MouseEvent) => {
      const currentHeightPx = moveEvent.clientY - startY;
      let newHeight = Math.max(50, Math.round(currentHeightPx));
      updateAttributes({ height: `${newHeight}px` });
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // 3. Resize Both (Bottom-Right Corner Handle)
  const handleCornerResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const parentWidth = containerRef.current?.parentElement?.offsetWidth || 1;
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = rect.left;
    const startY = rect.top;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentWidthPx = moveEvent.clientX - startX;
      const currentHeightPx = moveEvent.clientY - startY;
      let newPct = Math.max(10, Math.min(100, Math.round((currentWidthPx / parentWidth) * 100)));
      let newHeight = Math.max(50, Math.round(currentHeightPx));
      setWidth(`${newPct}%`);
      setHeight(`${newHeight}px`);
    };

    const handleMouseUp = (moveEvent: MouseEvent) => {
      const currentWidthPx = moveEvent.clientX - startX;
      const currentHeightPx = moveEvent.clientY - startY;
      let newPct = Math.max(10, Math.min(100, Math.round((currentWidthPx / parentWidth) * 100)));
      let newHeight = Math.max(50, Math.round(currentHeightPx));
      updateAttributes({ width: `${newPct}%`, height: `${newHeight}px` });
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <NodeViewWrapper
      ref={containerRef}
      style={{
        display,
        margin,
        float,
        width,
        height,
        maxWidth: "100%",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "inline-block",
          width: "100%",
          height: "100%",
          outline: selected ? "2px solid var(--primary)" : "none",
          borderRadius: 8,
          overflow: "visible",
          transition: "outline 0.15s ease",
        }}
      >
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "fill",
            display: "block",
            borderRadius: 8,
            cursor: "pointer",
          }}
        />
        {selected && (
          <>
            {/* Horizontal Resize Handle (Middle Right) */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                right: -4,
                transform: "translateY(-50%)",
                width: 8,
                height: 16,
                backgroundColor: "var(--primary)",
                border: "1px solid white",
                borderRadius: 4,
                cursor: "ew-resize",
                zIndex: 100,
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
              onMouseDown={handleWidthResize}
              title="Resize Width Only"
            />

            {/* Vertical Resize Handle (Middle Bottom) */}
            <div
              style={{
                position: "absolute",
                bottom: -4,
                left: "50%",
                transform: "translateX(-50%)",
                width: 16,
                height: 8,
                backgroundColor: "var(--primary)",
                border: "1px solid white",
                borderRadius: 4,
                cursor: "ns-resize",
                zIndex: 100,
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
              onMouseDown={handleHeightResize}
              title="Resize Height Only"
            />

            {/* Proportional Resize Handle (Bottom Right Corner) */}
            <div
              style={{
                position: "absolute",
                bottom: -5,
                right: -5,
                width: 12,
                height: 12,
                backgroundColor: "var(--primary)",
                border: "2px solid white",
                borderRadius: "50%",
                cursor: "se-resize",
                zIndex: 100,
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
              }}
              onMouseDown={handleCornerResize}
              title="Resize Width & Height"
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
};

// Custom Image extension to support resizing and alignment attributes
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: (element) => element.style.width || element.getAttribute("width") || "100%",
      },
      height: {
        default: "auto",
        parseHTML: (element) => element.style.height || element.getAttribute("height") || "auto",
      },
      alignment: {
        default: "center",
        parseHTML: (element) => {
          const float = element.style.float;
          if (float === "left") return "left";
          if (float === "right") return "right";
          return element.getAttribute("data-alignment") || "center";
        },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { alignment, width, height, ...rest } = HTMLAttributes;

    let display = "block";
    let margin = "8px auto";
    let float = "none";

    if (alignment === "left") {
      margin = "8px 12px 8px 0";
      float = "left";
      display = "inline-block";
    } else if (alignment === "right") {
      margin = "8px 0 8px 12px";
      float = "right";
      display = "inline-block";
    }

    const style = `display: ${display}; margin: ${margin}; float: ${float}; width: ${width || "100%"}; height: ${height || "auto"}; max-width: 100%; cursor: pointer; transition: outline 0.15s;`;

    return [
      "img",
      mergeAttributes(rest, {
        "data-alignment": alignment,
        style,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
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
      CustomImage.configure({
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

      {editable && editor.isActive("image") && (
        <div className="tiptap-image-toolbar" style={{ display: "flex", gap: 8, alignItems: "center", backgroundColor: "var(--bg-tertiary)", padding: "8px 16px", borderBottom: "1px solid var(--border-color)", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: "bold", color: "var(--primary)", display: "flex", alignItems: "center", gap: 4 }}>
            🖼️ Image Alignment:
          </span>
          <button
            type="button"
            onClick={() => editor.chain().focus().updateAttributes("image", { alignment: "left" }).run()}
            className={`tiptap-btn ${editor.getAttributes("image").alignment === "left" ? "is-active" : ""}`}
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            Left
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().updateAttributes("image", { alignment: "center" }).run()}
            className={`tiptap-btn ${editor.getAttributes("image").alignment === "center" || !editor.getAttributes("image").alignment ? "is-active" : ""}`}
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            Center
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().updateAttributes("image", { alignment: "right" }).run()}
            className={`tiptap-btn ${editor.getAttributes("image").alignment === "right" ? "is-active" : ""}`}
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            Right
          </button>

          <span style={{ borderLeft: "1px solid var(--border-color)", height: 16, margin: "0 6px" }}></span>

          <span style={{ fontSize: 12, fontWeight: "bold", color: "var(--primary)" }}>📏 Resize:</span>
          <button
            type="button"
            onClick={() => editor.chain().focus().updateAttributes("image", { width: "25%" }).run()}
            className={`tiptap-btn ${editor.getAttributes("image").width === "25%" ? "is-active" : ""}`}
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            25%
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().updateAttributes("image", { width: "50%" }).run()}
            className={`tiptap-btn ${editor.getAttributes("image").width === "50%" ? "is-active" : ""}`}
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            50%
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().updateAttributes("image", { width: "75%" }).run()}
            className={`tiptap-btn ${editor.getAttributes("image").width === "75%" ? "is-active" : ""}`}
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            75%
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().updateAttributes("image", { width: "100%" }).run()}
            className={`tiptap-btn ${editor.getAttributes("image").width === "100%" || !editor.getAttributes("image").width ? "is-active" : ""}`}
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            100%
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
