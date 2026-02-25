"use client";

import { SectionHeading } from "@/components/ui/section-heading";
import { useTranslation } from "@/hooks/useTranslation";
import type { FileWithUrl } from "@/types/files";
import { FileItem } from "./FileItem";

interface FileListProps {
	files: FileWithUrl[];
	onPreview: (file: FileWithUrl) => void;
	onDelete: (id: string) => void;
	readOnly?: boolean;
}

export function FileList({ files, onPreview, onDelete, readOnly }: FileListProps) {
	const { t } = useTranslation();

	if (files.length === 0) {
		return (
			<div style={{ textAlign: "center", padding: "48px 0" }}>
				<p style={{ color: "var(--text-tertiary)" }}>{t("fileList.empty")}</p>
			</div>
		);
	}

	return (
		<div>
			<SectionHeading uppercase={false} style={{ fontSize: "0.84rem", marginBottom: 12 }}>
				{t("fileList.title")}
			</SectionHeading>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
					gap: 16,
				}}
			>
				{files.map((file) => (
					<FileItem
						key={file.id}
						file={file}
						onPreview={onPreview}
						onDelete={onDelete}
						readOnly={readOnly}
					/>
				))}
			</div>
		</div>
	);
}
