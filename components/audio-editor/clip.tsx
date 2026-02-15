"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useDrag } from "@/hooks/use-drag";
import { snapToGrid } from "@/lib/audio";
import { useEditorStore } from "@/stores/editor-store";
import type { Clip as ClipType } from "@/types/editor";
import { Waveform } from "./waveform";

interface ClipProps {
	clip: ClipType;
	trackId: string;
	pixelsPerSecond: number;
	minorInterval: number;
}

interface DraggedClipProps {
	clip: ClipType;
	position: { top: number; left: number; width: number; height: number };
	offset: { x: number; y: number };
	pixelsPerSecond: number;
}

// Read-only component for dragged clip in portal with smooth animation
function DraggedClip({ clip, position, offset, pixelsPerSecond }: DraggedClipProps) {
	const _displayWidth =
		((clip.duration - clip.trimStart - clip.trimEnd) * pixelsPerSecond) / clip.playbackRate;

	return (
		<motion.div
			className="fixed rounded transition-colors overflow-hidden bg-purple-500/60 border-4 border-purple-400 shadow-2xl cursor-move"
			initial={{
				top: position.top,
				left: position.left,
				opacity: 0.7,
				scale: 0.98,
			}}
			animate={{
				top: position.top + offset.y,
				left: position.left + offset.x,
				opacity: 0.85,
				scale: 1.02,
			}}
			transition={{
				type: "spring",
				stiffness: 600,
				damping: 40,
				mass: 0.5,
			}}
			style={{
				width: `${position.width}px`,
				height: `${position.height}px`,
				zIndex: 100,
			}}
		>
			{clip.audioBuffer && (
				<Waveform
					audioBuffer={clip.audioBuffer}
					width={clip.duration * pixelsPerSecond}
					height={position.height}
					waveColor="#a78bfa"
					trimStart={clip.trimStart}
					trimEnd={clip.trimEnd}
				/>
			)}
			<div className="relative p-1 text-xs truncate pointer-events-none select-none font-semibold">
				{clip.filename}
			</div>
		</motion.div>
	);
}

export function Clip({ clip, trackId, pixelsPerSecond, minorInterval }: ClipProps) {
	// Use specific selectors to prevent unnecessary re-renders
	const updateClip = useEditorStore((state) => state.updateClip);
	const moveClip = useEditorStore((state) => state.moveClip);
	const selectClip = useEditorStore((state) => state.selectClip);
	const selectedClipId = useEditorStore((state) => state.selectedClipId);
	const mode = useEditorStore((state) => state.clipMode[clip.id] || "read");
	const setClipMode = useEditorStore((state) => state.setClipMode);
	const resetAllClipModes = useEditorStore((state) => state.resetAllClipModes);
	const deleteMode = useEditorStore((state) => state.deleteMode);
	const removeClip = useEditorStore((state) => state.removeClip);

	// Drag actions (stable references)
	const startDrag = useEditorStore((state) => state.startDrag);
	const updateDragOffset = useEditorStore((state) => state.updateDragOffset);
	const endDrag = useEditorStore((state) => state.endDrag);
	const activeDrag = useEditorStore((state) => state.activeDrag);

	const clipRef = useRef<HTMLDivElement>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Calculate snapped position during drag for visual feedback (transient read)
	const getSnappedDragOffset = () => {
		if (!activeDrag || activeDrag.clipId !== clip.id || activeDrag.type !== "move") {
			return { x: 0, y: 0 };
		}
		const currentTime = (clip.startTime * pixelsPerSecond + activeDrag.offset.x) / pixelsPerSecond;
		const snappedTime = snapToGrid(currentTime, minorInterval);
		const snappedX = snappedTime * pixelsPerSecond - clip.startTime * pixelsPerSecond;
		return { x: snappedX, y: activeDrag.offset.y };
	};

	// Handle click to select (without dragging) or delete
	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();

		// Delete mode: remove clip on click
		if (deleteMode) {
			removeClip(clip.id);
			return;
		}

		selectClip(clip.id);
	};

	// Trim handle drag handlers (for Cut mode) - using transient updates
	const { isDragging: isDraggingLeftTrim, dragHandlers: leftTrimHandlers } = useDrag({
		onDragStart: () => {
			startDrag(clip.id, "trim-start", { trimStart: clip.trimStart });
		},
		onDrag: (delta) => {
			const { activeDrag } = useEditorStore.getState();
			if (!activeDrag || activeDrag.clipId !== clip.id) return;

			updateDragOffset(delta);

			const deltaTime = activeDrag.offset.x / pixelsPerSecond;
			const newTrimStart = Math.max(
				0,
				Math.min(clip.duration - clip.trimEnd - 0.1, activeDrag.startValues.trimStart! + deltaTime),
			);
			updateClip(clip.id, { trimStart: newTrimStart });
		},
		onDragEnd: () => {
			endDrag();
		},
		axis: "x",
	});

	const { isDragging: isDraggingRightTrim, dragHandlers: rightTrimHandlers } = useDrag({
		onDragStart: () => {
			startDrag(clip.id, "trim-end", { trimEnd: clip.trimEnd });
		},
		onDrag: (delta) => {
			const { activeDrag } = useEditorStore.getState();
			if (!activeDrag || activeDrag.clipId !== clip.id) return;

			updateDragOffset(delta);

			const deltaTime = -activeDrag.offset.x / pixelsPerSecond;
			const newTrimEnd = Math.max(
				0,
				Math.min(clip.duration - clip.trimStart - 0.1, activeDrag.startValues.trimEnd! + deltaTime),
			);
			updateClip(clip.id, { trimEnd: newTrimEnd });
		},
		onDragEnd: () => {
			endDrag();
		},
		axis: "x",
	});

	// Volume/Tempo mode drag handler - using transient updates
	const { isDragging: isDraggingVolumeTempo, dragHandlers: volumeTempoHandlers } = useDrag({
		onDragStart: () => {
			startDrag(clip.id, "volume-tempo", {
				volume: clip.volume,
				playbackRate: clip.playbackRate,
			});
		},
		onDrag: (delta) => {
			const { activeDrag } = useEditorStore.getState();
			if (!activeDrag || activeDrag.clipId !== clip.id) return;

			updateDragOffset(delta);

			// Vertical: volume (inverted - up increases)
			const volumeDelta = -activeDrag.offset.y / 100;
			const newVolume = Math.max(0, Math.min(2, activeDrag.startValues.volume! + volumeDelta));

			// Horizontal: playback rate
			const rateDelta = activeDrag.offset.x / 200;
			const newRate = Math.max(0.5, Math.min(2, activeDrag.startValues.playbackRate! + rateDelta));

			updateClip(clip.id, { volume: newVolume, playbackRate: newRate });
		},
		onDragEnd: () => {
			endDrag();
		},
		axis: "both",
	});

	// Main clip drag (only in Read mode) - using transient updates
	const { isDragging, dragHandlers } = useDrag({
		onDragStart: (e) => {
			// Prevent drag on right-click to allow context menu
			if (e.button === 2) return;
			if (mode !== "read") return;
			selectClip(clip.id);
			startDrag(clip.id, "move", { startTime: clip.startTime });
		},
		onDrag: (delta) => {
			if (mode !== "read") return;
			updateDragOffset(delta);
		},
		onDragEnd: () => {
			if (mode !== "read") return;

			const { activeDrag } = useEditorStore.getState();
			if (!activeDrag || activeDrag.clipId !== clip.id) return;

			const newStartTime = snapToGrid(
				(clip.startTime * pixelsPerSecond + activeDrag.offset.x) / pixelsPerSecond,
				minorInterval,
			);

			// Check if moved vertically to a different track
			if (clipRef.current && Math.abs(activeDrag.offset.y) > 20) {
				const clipRect = clipRef.current.getBoundingClientRect();
				const trackElements = document.querySelectorAll("[data-track-id]");

				let targetTrackId = trackId;
				let minDistance = Infinity;

				// Calculate the center Y of the DRAGGED position (not the original position)
				const snapped = getSnappedDragOffset();
				const draggedCenterY = clipRect.top + clipRect.height / 2 + snapped.y;

				trackElements.forEach((el) => {
					const rect = el.getBoundingClientRect();
					const tid = el.getAttribute("data-track-id");

					if (tid && draggedCenterY >= rect.top && draggedCenterY <= rect.bottom) {
						const distance = Math.abs(draggedCenterY - (rect.top + rect.height / 2));
						if (distance < minDistance) {
							minDistance = distance;
							targetTrackId = tid;
						}
					}
				});

				if (targetTrackId !== trackId) {
					moveClip(clip.id, targetTrackId, Math.max(0, newStartTime));
					endDrag();
					return;
				}
			}

			// Just moved horizontally
			updateClip(clip.id, { startTime: Math.max(0, newStartTime) });
			endDrag();
		},
		axis: "both",
	});

	const isSelected = selectedClipId === clip.id;
	const clipZIndex = isDragging ? 100 : 10;

	// For portal rendering, check if this clip is being dragged
	const isBeingDragged = () => {
		return activeDrag?.clipId === clip.id && activeDrag?.type === "move";
	};

	// Get absolute position for portal rendering
	const getAbsolutePosition = () => {
		if (!clipRef.current) return { top: 0, left: 0, width: 0, height: 0 };
		const rect = clipRef.current.getBoundingClientRect();
		return {
			top: rect.top + window.scrollY,
			left: rect.left + window.scrollX,
			width: rect.width,
			height: rect.height,
		};
	};

	// Get border/background classes based on mode
	const getModeClasses = () => {
		if (deleteMode) {
			return "bg-red-500/40 border-3 border-red-400 ring-2 ring-red-500/50";
		}

		if (isDragging) {
			return "bg-purple-500/50 border-4 border-purple-400 shadow-xl opacity-80";
		}

		switch (mode) {
			case "cut":
				return isSelected
					? "bg-purple-500/25 border-3 border-red-500 ring-1 ring-red-400/30"
					: "bg-purple-500/20 border-3 border-red-500/80 hover:bg-purple-500/30";
			case "volume-tempo":
				return isSelected
					? "bg-purple-500/25 border-3 border-yellow-500 ring-1 ring-yellow-400/30"
					: "bg-purple-500/20 border-3 border-yellow-500/80 hover:bg-purple-500/30";
			default: // 'read'
				return isSelected
					? "bg-purple-500/30 border-3 border-purple-400 ring-2 ring-purple-400/40"
					: "bg-purple-500/20 border-2 border-purple-500/60 hover:bg-purple-500/30 hover:border-purple-400 hover:shadow-lg";
		}
	};

	const clipContent = () => {
		const displayWidth =
			((clip.duration - clip.trimStart - clip.trimEnd) * pixelsPerSecond) / clip.playbackRate;

		return (
			<div
				ref={clipRef}
				className={`absolute top-1 bottom-1 rounded-md overflow-hidden clip-smooth ${
					isDragging ? "opacity-30" : getModeClasses()
				} ${mode === "read" ? "cursor-move" : "cursor-pointer"}
        backdrop-blur-sm`}
				style={{
					left: `${clip.startTime * pixelsPerSecond}px`,
					width: `${displayWidth}px`,
					zIndex: clipZIndex,
					boxShadow: isDragging ? "0 10px 40px rgba(0,0,0,0.5)" : undefined,
				}}
				onClick={handleClick}
				{...(mode === "read" ? dragHandlers : {})}
			>
				{clip.audioBuffer && (
					<Waveform
						audioBuffer={clip.audioBuffer}
						width={clip.duration * pixelsPerSecond}
						height={clipRef.current?.clientHeight || 60}
						waveColor="#a78bfa"
						trimStart={clip.trimStart}
						trimEnd={clip.trimEnd}
					/>
				)}
				<div className="relative p-1 text-xs truncate pointer-events-none select-none">
					{clip.filename}
				</div>

				{/* Mode badge */}
				{mode !== "read" && (
					<div
						className={`absolute top-1 right-1 px-1.5 py-0.5 text-[9px] font-bold rounded-md pointer-events-none shadow-md border ${
							mode === "cut"
								? "bg-red-600 text-white border-red-400/50 shadow-red-900/50"
								: "bg-yellow-500 text-black border-yellow-300/50 shadow-yellow-900/50"
						}`}
					>
						{mode === "cut" ? "CUT" : "V/T"}
					</div>
				)}

				{/* Cut mode: trim handles */}
				{mode === "cut" && (
					<>
						<div
							className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-red-600 to-red-500 cursor-ew-resize hover:w-4 transition-all shadow-[inset_1px_0_2px_rgba(0,0,0,0.5)] border-r border-red-400/50"
							{...leftTrimHandlers}
							onClick={(e) => e.stopPropagation()}
						>
							<div className="absolute inset-y-1/2 left-0.5 w-0.5 h-4 -translate-y-1/2 bg-white/40 rounded-full"></div>
						</div>
						<div
							className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-l from-red-600 to-red-500 cursor-ew-resize hover:w-4 transition-all shadow-[inset_-1px_0_2px_rgba(0,0,0,0.5)] border-l border-red-400/50"
							{...rightTrimHandlers}
							onClick={(e) => e.stopPropagation()}
						>
							<div className="absolute inset-y-1/2 right-0.5 w-0.5 h-4 -translate-y-1/2 bg-white/40 rounded-full"></div>
						</div>
					</>
				)}

				{/* Volume/Tempo mode: overlay */}
				{mode === "volume-tempo" && (
					<div
						className="absolute inset-0 bg-gradient-to-br from-yellow-500/25 via-yellow-400/20 to-amber-500/25 flex items-center justify-center cursor-move backdrop-blur-[2px]"
						{...volumeTempoHandlers}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="bg-black/80 px-2 py-1 rounded-md text-[10px] font-mono pointer-events-none shadow-lg border border-yellow-500/30">
							<span className="text-yellow-400">Vol:</span>{" "}
							<span className="text-white font-semibold">{(clip.volume * 100).toFixed(0)}%</span>
							<span className="text-muted-foreground mx-1">|</span>
							<span className="text-amber-400">Rate:</span>{" "}
							<span className="text-white font-semibold">{clip.playbackRate.toFixed(2)}x</span>
						</div>
					</div>
				)}
			</div>
		);
	};

	return (
		<>
			<ContextMenu
				onOpenChange={(open) => {
					if (open) {
						// Reset all clips to read mode, then select this clip
						resetAllClipModes();
						selectClip(clip.id);
					}
				}}
			>
				<ContextMenuTrigger asChild>{clipContent()}</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuItem onClick={() => setClipMode(clip.id, "read")}>Read Mode</ContextMenuItem>
					<ContextMenuItem onClick={() => setClipMode(clip.id, "cut")}>Cut Mode</ContextMenuItem>
					<ContextMenuItem onClick={() => setClipMode(clip.id, "volume-tempo")}>
						Volume/Tempo Mode
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem onClick={() => removeClip(clip.id)} className="text-red-500">
						Delete
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>

			{/* Portal clip when dragging */}
			{isDragging &&
				mounted &&
				isBeingDragged() &&
				createPortal(
					<DraggedClip
						clip={clip}
						position={getAbsolutePosition()}
						offset={getSnappedDragOffset()}
						pixelsPerSecond={pixelsPerSecond}
					/>,
					document.body,
				)}
		</>
	);
}
