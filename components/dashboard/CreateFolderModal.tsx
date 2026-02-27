"use client";

import { FolderPlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { InlineButton } from "@/components/ui/inline-button";
import { Modal } from "@/components/ui/modal";
import { TextInput } from "@/components/ui/text-input";
import { useTranslation } from "@/hooks/useTranslation";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function CreateFolderModal({ isOpen, onClose, onSubmit }: CreateFolderModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={onClose} maxWidth={400}>
      <div
        style={{
          padding: "20px 20px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FolderPlus size={20} style={{ color: "var(--accent-purple)" }} />
          <h3
            style={{
              margin: 0,
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {t("createFolder.title")}
          </h3>
        </div>
        <IconButton variant="square" size="xs" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>
      <form onSubmit={handleSubmit} style={{ padding: "0 20px 20px" }}>
        <TextInput
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("createFolder.placeholder")}
          variant="default"
          style={{ width: "100%", boxSizing: "border-box" }}
        />
        <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <InlineButton type="button" variant="secondary" onClick={onClose}>
            {t("createFolder.cancel")}
          </InlineButton>
          <InlineButton type="submit" variant="accent" style={{ fontWeight: 600 }}>
            {t("createFolder.create")}
          </InlineButton>
        </div>
      </form>
    </Modal>
  );
}
