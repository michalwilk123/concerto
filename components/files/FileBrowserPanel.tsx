"use client";

import { FolderPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/dashboard/Breadcrumbs";
import { CreateFolderModal } from "@/components/dashboard/CreateFolderModal";
import { FileList } from "@/components/dashboard/FileList";
import { FileUploader } from "@/components/dashboard/FileUploader";
import { FolderList } from "@/components/dashboard/FolderList";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { FilePreviewModal } from "@/components/dashboard/preview/FilePreviewModal";
import { useToast } from "@/components/Toast";
import { InlineButton } from "@/components/ui/inline-button";
import { buildDashboardUrl } from "@/lib/dashboard-url";
import { useFileManagerStore } from "@/stores/file-manager-store";
import { useTranslation } from "@/hooks/useTranslation";
import type { FolderDoc } from "@/types/files";

interface FileBrowserPanelProps {
	allowManage: boolean;
	showCreateFolderButton?: boolean;
	compact?: boolean;
	groupId: string;
	ancestors: FolderDoc[];
	initialFolderId?: string;
}

export function FileBrowserPanel({
	allowManage,
	showCreateFolderButton = true,
	compact = false,
	groupId,
	ancestors,
	initialFolderId,
}: FileBrowserPanelProps) {
	const router = useRouter();
	const toast = useToast();
	const { t } = useTranslation();
	const [showCreateFolder, setShowCreateFolder] = useState(false);
	const {
		files,
		folders,
		currentFolderId,
		currentGroupId,
		previewFile,
		isLoading,
		hasFetched,
		setCurrentGroupId,
		setCurrentFolderId,
		setPreviewFile,
		fetchContents,
		deleteFile,
		createFolder,
		deleteFolder,
	} = useFileManagerStore();

	// When used in sidebar with initialFolderId, initialize the store
	useEffect(() => {
		if (!initialFolderId) return;
		if (currentGroupId !== groupId) {
			setCurrentGroupId(groupId);
		}
		setCurrentFolderId(initialFolderId);
		fetchContents(initialFolderId);
	}, [
		initialFolderId,
		groupId,
		currentGroupId,
		fetchContents,
		setCurrentFolderId,
		setCurrentGroupId,
	]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleNavigateToFolder = (folderId: string | null) => {
		router.push(buildDashboardUrl(groupId, { folderId }));
	};

	const handleUploadComplete = () => {
		fetchContents(currentFolderId);
		toast.success(t("files.uploadSuccess"));
	};

	const handleDeleteFile = async (id: string) => {
		try {
			await deleteFile(id);
			toast.success(t("files.deleteSuccess"));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t("files.deleteFailed"));
		}
	};

	const handleDeleteFolder = async (id: string) => {
		try {
			await deleteFolder(id);
			toast.success(t("files.folderDeleteSuccess"));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t("files.deleteFailed"));
		}
	};

	const handleCreateFolder = async (name: string) => {
		try {
			await createFolder(name);
			toast.success(t("files.createFolderSuccess", { name }));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t("files.createFolderFailed"));
		}
	};

	return (
		<>
			<div
				style={{
					padding: compact ? "var(--space-md)" : 0,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 24,
					}}
				>
					<Breadcrumbs groupId={groupId} ancestors={ancestors} />
					{allowManage && showCreateFolderButton && (
						<InlineButton
							variant="accent"
							size="md"
							onClick={() => setShowCreateFolder(true)}
							style={{ display: "flex", alignItems: "center", gap: 8 }}
						>
							<FolderPlus size={16} />
							{t("files.newFolder")}
						</InlineButton>
					)}
				</div>

				{allowManage && (
					<FileUploader
						groupId={groupId}
						folderId={currentFolderId}
						onUploadComplete={handleUploadComplete}
					/>
				)}

				{isLoading && !hasFetched ? (
					<LoadingSkeleton />
				) : (
					<>
						<FolderList
							folders={folders}
							onNavigate={handleNavigateToFolder}
							onDelete={handleDeleteFolder}
							readOnly={!allowManage}
						/>
						<FileList
							files={files}
							onPreview={(file) => setPreviewFile(file)}
							onDelete={handleDeleteFile}
							readOnly={!allowManage}
						/>
					</>
				)}
			</div>

			{allowManage && showCreateFolderButton && (
				<CreateFolderModal
					isOpen={showCreateFolder}
					onClose={() => setShowCreateFolder(false)}
					onSubmit={handleCreateFolder}
				/>
			)}

			<FilePreviewModal
				isOpen={!!previewFile}
				onClose={() => setPreviewFile(null)}
				fileName={previewFile?.name ?? ""}
				fileUrl={previewFile?.url ?? null}
				mimeType={previewFile?.mimeType ?? ""}
			/>
		</>
	);
}
