import { useState, useCallback, useMemo } from 'react';

export interface UseRemoteMediaElementsReturn {
  elements: Map<string, HTMLVideoElement>;
  setElement: (peerId: string, element: HTMLVideoElement | null) => void;
  primaryElement: HTMLVideoElement | null;
}

export function useRemoteMediaElements(): UseRemoteMediaElementsReturn {
  const [elements, setElements] = useState<Map<string, HTMLVideoElement>>(new Map());

  const setElement = useCallback((peerId: string, element: HTMLVideoElement | null) => {
    setElements((prev) => {
      const next = new Map(prev);
      if (element) {
        next.set(peerId, element);
      } else {
        next.delete(peerId);
      }
      return next;
    });
  }, []);

  const primaryElement = useMemo(() => {
    return elements.values().next().value ?? null;
  }, [elements]);

  return {
    elements,
    setElement,
    primaryElement,
  };
}
