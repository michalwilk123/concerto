"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { filesApi } from "@/lib/api-client";

interface FileUploaderProps {
	folderId?: string | null;
	onUploadComplete?: () => void;
}

export function FileUploader({ folderId, onUploadComplete }: FileUploaderProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleUpload = async (file: File) => {
		try {
			setUploading(true);
			setProgress(30);
			setProgress(50);
			await filesApi.upload({ file, folderId });
			setProgress(100);
			setTimeout(() => {
				setProgress(0);
				setUploading(false);
				onUploadComplete?.();
			}, 500);
		} catch (error) {
			console.error("Upload failed:", error);
			setUploading(false);
			setProgress(0);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files[0];
		if (file) handleUpload(file);
	};

	return (
		<div style={{ marginBottom: 24 }}>
			<div
				onDragOver={(e) => {
					e.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={() => setIsDragging(false)}
				onDrop={handleDrop}
				onClick={() => {
					if (!uploading) fileInputRef.current?.click();
				}}
				style={{
					position: "relative",
					cursor: "pointer",
					borderRadius: "var(--radius-lg)",
					border: `2px dashed ${isDragging ? "var(--accent-purple)" : "var(--border-default)"}`,
					padding: 32,
					textAlign: "center",
					background: isDragging ? "rgba(139, 92, 246, 0.05)" : "var(--bg-tertiary)",
					transition: "border-color 0.2s, background 0.2s",
				}}
			>
				<input
					ref={fileInputRef}
					type="file"
					style={{ display: "none" }}
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) handleUpload(file);
					}}
					disabled={uploading}
				/>
				<Upload size={40} style={{ margin: "0 auto", color: "var(--text-tertiary)" }} />
				<p
					style={{
						marginTop: 8,
						fontSize: "0.875rem",
						fontWeight: 500,
						color: "var(--text-secondary)",
					}}
				>
					{uploading ? "Uploading..." : "Drop files here or click to upload"}
				</p>
				<p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Max 50MB per file</p>
				{uploading && (
					<div style={{ marginTop: 16 }}>
						<ProgressBar value={progress / 100} color="var(--accent-purple)" height={6} />
					</div>
				)}
			</div>
		</div>
	);
}
