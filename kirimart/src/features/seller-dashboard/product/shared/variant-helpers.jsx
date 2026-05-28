"use client"

import { useState, useRef } from "react"
import { Loader2, X, Image as ImageIcon } from "lucide-react"
import { uploadFile } from "@/lib/upload"

// Re-export uploadFile agar import lama dari file ini tetap berfungsi
export { uploadFile }

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function generateCartesian(options) {
	if (!options || options.length === 0) return []
	return options.reduce((acc, option) => {
		const result = []
		acc.forEach(existing => {
			option.values.forEach(val => {
				result.push({ ...existing, [option.name]: val })
			})
		})
		return result
	}, [{}])
}

export function attrKey(attrs) {
	return JSON.stringify(attrs, Object.keys(attrs).sort())
}

// ─── OptionValuesInput ────────────────────────────────────────────────────────
export function OptionValuesInput({ value = [], onChange, displayType, onUploadImage }) {
	const [inputStr, setInputStr] = useState("")
	const [uploadingIdx, setUploadingIdx] = useState(null)
	const inputRef = useRef(null)

	function commitInput() {
		const trimmed = inputStr.trim().replace(/,+$/, "")
		if (trimmed) {
			const parts = trimmed.split(",").map(s => s.trim()).filter(Boolean)
			onChange([...value, ...parts])
			setInputStr("")
		}
	}

	function handleKeyDown(e) {
		if (e.key === "Enter") { e.preventDefault(); commitInput() }
		else if (e.key === "Backspace" && inputStr === "" && value.length > 0) onChange(value.slice(0, -1))
	}

	function handleChange(e) {
		const val = e.target.value
		setInputStr(val)
		if (val.endsWith(",")) {
			const trimmed = val.replace(/,+$/, "").trim()
			if (trimmed) { onChange([...value, trimmed]); setInputStr("") }
		}
	}

	async function handleImageUpload(e, idx) {
		const file = e.target.files?.[0]
		if (!file) return
		setUploadingIdx(idx)
		const url = await uploadFile(file)
		if (url && onUploadImage) onUploadImage(idx, url)
		setUploadingIdx(null)
		e.target.value = ""
	}

	return (
		<div className="space-y-2">
			<div
				className="min-h-10 flex flex-wrap gap-1.5 items-center p-2 border rounded-md cursor-text bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-ring"
				onClick={() => inputRef.current?.focus()}
			>
				{value.map((tag, idx) => (
					<span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20 select-none">
						{displayType === "image" && (
							<label className="cursor-pointer" title="Upload gambar">
								{uploadingIdx === idx ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3 opacity-60 hover:opacity-100 transition-opacity" />}
								<input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, idx)} />
							</label>
						)}
						{tag}
						<button type="button" onClick={() => onChange(value.filter((_, i) => i !== idx))} className="ml-0.5 hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
					</span>
				))}
				<input
					ref={inputRef} type="text" value={inputStr}
					onChange={handleChange} onKeyDown={handleKeyDown} onBlur={commitInput}
					placeholder={value.length === 0 ? (displayType === "image" ? "Ketik nama nilai lalu Enter..." : "Ketik nilai, pisahkan dengan koma atau Enter...") : ""}
					className="flex-1 min-w-[140px] outline-none bg-transparent text-sm py-0.5 placeholder:text-muted-foreground placeholder:text-xs"
				/>
			</div>
			<p className="text-[11px] text-muted-foreground leading-relaxed">
				{displayType === "image" ? "Ketik nama → Enter → klik ikon gambar di tiap tag untuk upload foto" : "Ketik lalu tekan Enter atau koma untuk menambah. Backspace untuk hapus."}
			</p>
		</div>
	)
}
