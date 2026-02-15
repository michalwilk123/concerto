"use client";

import { FolderPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Breadcrumbs } from "@/components/dashboard/Breadcrumbs";
import { CreateFolderModal } from "@/components/dashboard/CreateFolderModal";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { FileList } from "@/components/dashboard/FileList";
import { FileUploader } from "@/components/dashboard/FileUploader";
import { FolderList } from "@/components/dashboard/FolderList";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { FilePreviewModal } from "@/components/dashboard/preview/FilePreviewModal";
import { useToast } from "@/components/Toast";
import { InlineButton } from "@/components/ui/inline-button";
import { filesApi, foldersApi } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { useFileManagerStore } from "@/stores/file-manager-store";

export default function DashboardPage() {
	const router = useRouter();
	const { data: session, isPending } = useSession();
	const toast = useToast();
	const hasSeeded = useRef(false);
	const [showCreateFolder, setShowCreateFolder] = useState(false);
	const [meetingsFolderId, setMeetingsFolderId] = useState<string | null>(null);

	const {
		files,
		folders,
		currentFolderId,
		currentFolder,
		previewFile,
		isLoading,
		hasFetched,
		setPreviewFile,
		fetchContents,
		uploadFile,
		deleteFile,
		createFolder,
		deleteFolder,
		navigateToFolder,
	} = useFileManagerStore();

	const user = session?.user;
	const isAdmin = user?.role === "admin";

	// Redirect unauthenticated users
	useEffect(() => {
		if (!isPending && !session) {
			router.push("/login");
		}
	}, [isPending, session, router]);

	// Seed files for admin on first visit
	useEffect(() => {
		if (!user || !isAdmin || hasSeeded.current) return;
		hasSeeded.current = true;

		filesApi
			.seed()
			.then((data) => {
				if (data.meetingsFolderId) {
					setMeetingsFolderId(data.meetingsFolderId);
				}
				fetchContents(null);
			})
			.catch(() => {
				/* ignore seed errors */
			});
	}, [user, isAdmin, fetchContents]);

	// Load meetings folder ID for non-admin or on mount
	useEffect(() => {
		if (!user || !isAdmin) return;
		foldersApi
			.findMeetingsFolder()
			.then((folder) => {
				if (folder) setMeetingsFolderId(folder.id);
			})
			.catch(() => {});
	}, [user, isAdmin]);

	// Initial content load
	useEffect(() => {
		if (user) fetchContents(currentFolderId);
	}, [user, currentFolderId, fetchContents]);

	const handleUploadComplete = () => {
		fetchContents(currentFolderId);
		toast.success("File uploaded successfully");
	};

	const handleDeleteFile = async (id: string) => {
		try {
			await deleteFile(id);
			toast.success("File deleted");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Delete failed");
		}
	};

	const handleDeleteFolder = async (id: string) => {
		try {
			await deleteFolder(id);
			toast.success("Folder deleted");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Delete failed");
		}
	};

	const handleCreateFolder = async (name: string) => {
		try {
			await createFolder(name);
			toast.success(`Folder "${name}" created`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to create folder");
		}
	};

	if (isPending) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flex: 1,
					background: "var(--bg-primary)",
					color: "var(--text-secondary)",
				}}
			>
				Loading...
			</div>
		);
	}

	if (!session) return null;

	return (
		<>
			<div
				style={{ display: "flex", flex: 1, overflow: "hidden", background: "var(--bg-primary)" }}
			>
				{isAdmin && <DashboardSidebar meetingsFolderId={meetingsFolderId} />}
				<main style={{ flex: 1, overflow: "auto", padding: 24 }}>
					<div style={{ maxWidth: 1200, margin: "0 auto" }}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: 24,
							}}
						>
							<Breadcrumbs currentFolder={currentFolder} onNavigate={navigateToFolder} />
							{isAdmin && (
								<InlineButton
									variant="accent"
									size="md"
									onClick={() => setShowCreateFolder(true)}
									style={{ display: "flex", alignItems: "center", gap: 8 }}
								>
									<FolderPlus size={16} />
									New Folder
								</InlineButton>
							)}
						</div>

						{isAdmin && (
							<FileUploader folderId={currentFolderId} onUploadComplete={handleUploadComplete} />
						)}

						{isLoading && !hasFetched ? (
							<LoadingSkeleton />
						) : (
							<>
								<FolderList
									folders={folders}
									onNavigate={navigateToFolder}
									onDelete={handleDeleteFolder}
									readOnly={!isAdmin}
								/>
								<FileList
									files={files}
									onPreview={(file) => setPreviewFile(file)}
									onDelete={handleDeleteFile}
									readOnly={!isAdmin}
								/>
							</>
						)}
					</div>
				</main>
			</div>

			<CreateFolderModal
				isOpen={showCreateFolder}
				onClose={() => setShowCreateFolder(false)}
				onSubmit={handleCreateFolder}
			/>

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
