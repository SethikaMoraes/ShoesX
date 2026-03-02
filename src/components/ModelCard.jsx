import { useEffect, useRef, useState } from 'react';

export default function ModelCard({
  title,
  subtitle = '',
  modelSrc,
  poster,
  description = '',
}) {
  const viewerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);

    const viewer = viewerRef.current;
    if (!viewer) return () => {};

    const onLoad = () => {
      setIsLoaded(true);
      setHasError(false);
    };

    const onError = () => {
      setIsLoaded(false);
      setHasError(true);
    };

    viewer.addEventListener('load', onLoad);
    viewer.addEventListener('error', onError);

    return () => {
      viewer.removeEventListener('load', onLoad);
      viewer.removeEventListener('error', onError);
    };
  }, [modelSrc]);

  return (
    <article className="panel flex h-full flex-col p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle ? <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950/40">
        {!isLoaded && !hasError ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-sm font-medium text-slate-600 dark:text-slate-300">
            Loading 3D model...
          </div>
        ) : null}

        {hasError ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-4 text-center text-sm font-medium text-rose-600 dark:text-rose-300">
            Unable to load this 3D model.
          </div>
        ) : null}

        <model-viewer
          ref={viewerRef}
          src={modelSrc}
          poster={poster}
          camera-controls
          auto-rotate
          shadow-intensity="1"
          style={{ width: '100%', height: '320px' }}
        />
      </div>

      {description ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{description}</p> : null}
    </article>
  );
}
