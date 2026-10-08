import { useEffect, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { getAssetUrl } from "../api/client";

const DaycarePhotoGallery = ({ images = [], title = "Daycare" }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [fullscreen, setFullscreen] = useState(false);
    const safeIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));
    const showPrevious = () => setActiveIndex((index) => (index - 1 + images.length) % images.length);
    const showNext = () => setActiveIndex((index) => (index + 1) % images.length);

    useEffect(() => {
        if (!fullscreen) return undefined;
        const previousOverflow = document.body.style.overflow;
        const closeOnEscape = (event) => { if (event.key === "Escape") setFullscreen(false); };
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", closeOnEscape);
        };
    }, [fullscreen]);

    if (!images.length) {
        return <div className="flex h-56 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 via-indigo-50 to-cyan-100 text-indigo-400 sm:h-80"><div className="flex flex-col items-center gap-2"><Camera size={32} /><span className="text-sm font-medium">No photos available</span></div></div>;
    }

    return (
        <div className="grid grid-cols-[minmax(0,1fr)_76px] gap-2 sm:grid-cols-[minmax(0,1fr)_112px] sm:gap-3">
            <div className="group relative min-w-0 overflow-hidden rounded-2xl bg-slate-100">
                <a href={getAssetUrl(images[safeIndex])} target="_blank" rel="noreferrer" className="block h-full w-full">
                    <img src={getAssetUrl(images[safeIndex])} alt={`${title} photo ${safeIndex + 1}`} className="h-56 w-full object-cover sm:h-80" />
                </a>
                {images.length > 1 && <>
                    <button type="button" onClick={showPrevious} aria-label="Previous daycare photo" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg transition hover:scale-105 hover:bg-white"><ChevronLeft size={22} /></button>
                    <button type="button" onClick={showNext} aria-label="Next daycare photo" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg transition hover:scale-105 hover:bg-white"><ChevronRight size={22} /></button>
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/65 px-3 py-1 text-xs font-semibold text-white">{safeIndex + 1} / {images.length}</span>
                </>}
                <button type="button" onClick={() => setFullscreen(true)} aria-label="View photo fullscreen" title="View full size" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg transition hover:scale-105 hover:bg-white"><Maximize2 size={18} /></button>
            </div>
            <div className="flex max-h-56 flex-col gap-2 overflow-y-auto overscroll-contain sm:max-h-80 sm:gap-3">
                {images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setActiveIndex(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={safeIndex === index} className={`shrink-0 overflow-hidden rounded-xl border-2 transition ${safeIndex === index ? "border-indigo-500 ring-2 ring-indigo-100" : "border-transparent opacity-75 hover:opacity-100"}`}><img src={getAssetUrl(image)} alt={`${title} thumbnail ${index + 1}`} className="h-16 w-full object-cover sm:h-[4.55rem]" /></button>)}
            </div>
            {fullscreen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4" onMouseDown={(event) => event.target === event.currentTarget && setFullscreen(false)}>
                <button type="button" onClick={() => setFullscreen(false)} aria-label="Close full screen photo" className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"><X size={23} /></button>
                <img src={getAssetUrl(images[safeIndex])} alt={`${title} photo ${safeIndex + 1} full screen`} className="max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] object-contain" />
                {images.length > 1 && <>
                    <button type="button" onClick={showPrevious} aria-label="Previous daycare photo" className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:left-8"><ChevronLeft size={28} /></button>
                    <button type="button" onClick={showNext} aria-label="Next daycare photo" className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:right-8"><ChevronRight size={28} /></button>
                    <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white">{safeIndex + 1} / {images.length}</span>
                </>}
            </div>}
        </div>
    );
};

export default DaycarePhotoGallery;
