"use client";

import { SectionHeading } from "@/components/ui/section-heading";
import type { FileWithUrl } from "@/types/files";
import { FileItem } from "./FileItem";

interface FileListProps {
	files: FileWithUrl[];
	onPreview: (file: FileWithUrl) => void;
	onDelete: (id: string) => void;
	readOnly?: boolean;
}

export function FileList({ files, onPreview, onDelete, readOnly }: FileListProps) {
	if (files.length === 0) {
		return (
			<div style={{ textAlign: "center", padding: "48px 0" }}>
				<p style={{ color: "var(--text-tertiary)" }}>No files in this folder.</p>
			</div>
		);
	}

	return (
		<div>
			<SectionHeading uppercase={false} style={{ fontSize: "0.84rem", marginBottom: 12 }}>
				Files
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
