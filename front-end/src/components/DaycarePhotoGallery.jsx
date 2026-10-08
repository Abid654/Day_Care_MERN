import { useState } from "react";
import { Camera } from "lucide-react";
import { getAssetUrl } from "../api/client";

const DaycarePhotoGallery = ({ images = [], title = "Daycare" }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const safeIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));

    if (!images.length) {
        return <div className="flex h-56 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 via-indigo-50 to-cyan-100 text-indigo-400 sm:h-80"><div className="flex flex-col items-center gap-2"><Camera size={32} /><span className="text-sm font-medium">No photos available</span></div></div>;
    }

    return (
        <div className="grid grid-cols-[minmax(0,1fr)_76px] gap-2 sm:grid-cols-[minmax(0,1fr)_112px] sm:gap-3">
            <a href={getAssetUrl(images[safeIndex])} target="_blank" rel="noreferrer" className="block min-w-0 overflow-hidden rounded-2xl bg-slate-100">
                <img src={getAssetUrl(images[safeIndex])} alt={`${title} photo ${safeIndex + 1}`} className="h-56 w-full object-cover sm:h-80" />
            </a>
            <div className="flex max-h-56 flex-col gap-2 overflow-y-auto overscroll-contain sm:max-h-80 sm:gap-3">
                {images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setActiveIndex(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={safeIndex === index} className={`shrink-0 overflow-hidden rounded-xl border-2 transition ${safeIndex === index ? "border-indigo-500 ring-2 ring-indigo-100" : "border-transparent opacity-75 hover:opacity-100"}`}><img src={getAssetUrl(image)} alt={`${title} thumbnail ${index + 1}`} className="h-16 w-full object-cover sm:h-[4.55rem]" /></button>)}
            </div>
        </div>
    );
};

export default DaycarePhotoGallery;
