"use client";

import { FolderPlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ButtonGroup, type ButtonGroupItem } from "@/components/ui/button-group";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { TextInput } from "@/components/ui/text-input";
import { useTranslation } from "@/hooks/useTranslation";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function CreateFolderModal({ isOpen, onClose, onSubmit }: CreateFolderModalProps) {
  return (
    <Modal open={isOpen} onClose={onClose} maxWidth={400}>
      {isOpen ? <CreateFolderForm key="create-folder-open" onClose={onClose} onSubmit={onSubmit} /> : null}
    </Modal>
  );
}

interface CreateFolderFormProps {
  onClose: () => void;
  onSubmit: (name: string) => void;
}

function CreateFolderForm({ onClose, onSubmit }: CreateFolderFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timeout);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
    onClose();
  };

  const actions: ButtonGroupItem[] = [
    {
      id: "cancel",
      label: t("createFolder.cancel"),
      onClick: onClose,
    },
    {
      id: "create",
      label: t("createFolder.create"),
      type: "submit",
      tone: "primary",
    },
  ];

  return (
    <>
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
        <div style={{ marginTop: 16 }}>
          <ButtonGroup variant="toolbar" size="sm" items={actions} className="justify-end" />
        </div>
      </form>
    </>
  );
}
