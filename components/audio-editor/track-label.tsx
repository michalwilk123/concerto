"use client";

import { useEffect, useRef, useState } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useEditorStore } from "@/stores/editor-store";
import type { Track } from "@/types/editor";

interface TrackLabelProps {
	track: Track;
}

export function TrackLabel({ track }: TrackLabelProps) {
	const { renameTrack, removeTrack, tracks } = useEditorStore();
	const [isEditing, setIsEditing] = useState(false);
	const [name, setName] = useState(track.name);
	const inputRef = useRef<HTMLInputElement>(null);

	// Sync name state when track.name changes externally
	useEffect(() => {
		setName(track.name);
	}, [track.name]);

	// Focus input when editing starts
	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	const handleRename = () => {
		if (name.trim()) {
			renameTrack(track.id, name.trim());
		} else {
			setName(track.name); // Revert if empty
		}
		setIsEditing(false);
	};

	const canDelete = tracks.length > 1;

	return (
		<div className="border-b-2 border-border/80">
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<div className="h-16 px-2 flex items-center bg-background/50 hover:bg-muted/30 transition-colors cursor-default">
						{isEditing ? (
							<input
								ref={inputRef}
								value={name}
								onChange={(e) => setName(e.target.value)}
								onBlur={handleRename}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleRename();
									if (e.key === "Escape") {
										setName(track.name);
										setIsEditing(false);
									}
								}}
								className="w-full bg-muted px-2 py-1 text-sm rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary"
							/>
						) : (
							<span className="text-sm font-semibold truncate text-foreground/90">
								{track.name}
							</span>
						)}
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuItem onClick={() => setIsEditing(true)}>Rename</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={() => removeTrack(track.id)}
						disabled={!canDelete}
						className="text-destructive focus:text-destructive"
					>
						Delete Track
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
		</div>
	);
}
