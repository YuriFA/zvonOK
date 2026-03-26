# PrejoinView — Поток локального стрима

Как получается MediaStream от getUserMedia до отображения в UI.

## Диаграмма

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         ИНИЦИАЛИЗАЦИЯ ПРИ МОНТИРОВАНИИ                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

   room.tsx:85-101                    media-stream.context.tsx:101
┌───────────────────────┐          ┌─────────────────────────────────────┐
│ MediaManagerProvider  │          │      MediaStreamProvider            │
│   mediaManager        │          │                                     │
└───────────┬───────────┘          │  useEffect(() => {                  │
            │                      │    const saved = loadSelectedDevices()│
            │                      │    start({ deviceId: saved })       │
            ▼                      │  }, [])                             │
┌───────────────────────┐          └──────────────────┬──────────────────┘
│ MediaStreamProvider   │                             │
│   (mount)             │                             ▼
└───────────────────────┘          media-stream.context.tsx:55
                                   ┌─────────────────────────────────────┐
                                   │           start()                   │
                                   ├─────────────────────────────────────┤
                                   │  deviceSelector.setSelected*()     │
                                   │  setIsLoading(true)                │
                                   │  acquisition.startStream()         │
                                   └──────────────────┬──────────────────┘
                                                      │
                                                      ▼
                                   manager.ts:64
                                   ┌─────────────────────────────────────┐
                                   │    MediaStreamManager.startStream() │
                                   ├─────────────────────────────────────┤
                                   │  return this.acquisition.start()    │
                                   └──────────────────┬──────────────────┘
                                                      │
                                                      ▼
                                   acquisition.ts:132
                                   ┌─────────────────────────────────────┐
                                   │      MediaAcquisition.start()       │
                                   ├─────────────────────────────────────┤
                                   │  this.pendingPromise = doStart()    │
                                   └──────────────────┬──────────────────┘
                                                      │
                                                      ▼
                                   acquisition.ts:151
                                   ┌─────────────────────────────────────┐
                                   │      MediaAcquisition.doStart()     │
                                   ├─────────────────────────────────────┤
                                   │  const merged = mergeConstraints()  │
                                   │                                      │
                                   │  merged = {                          │
                                   │    video: { deviceId?, width, height },
                                   │    audio: { deviceId? }              │
                                   │  }                                   │
                                   └──────────────────┬──────────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              getUserMedia                                            │
│                         acquisition.ts:165                                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   const stream = await navigator.mediaDevices.getUserMedia(merged)                  │
│                                                                                      │
│                         ┌─────────────────────────┐                                 │
│                         │   Browser Permission    │                                 │
│                         │   Dialog                │                                 │
│                         │                         │                                 │
│                         │   [Allow]  [Block]      │                                 │
│                         └───────────┬─────────────┘                                 │
│                                     │                                                │
│              ┌──────────────────────┴──────────────────────┐                        │
│              ▼                                              ▼                        │
│   ┌──────────────────────┐                    ┌──────────────────────┐              │
│   │   NotAllowedError    │                    │   stream obtained    │              │
│   │                      │                    │                      │              │
│   │   Fallback strategies│                    │   this.stream = stream│              │
│   │                      │                    │   stateStore.setStatus│              │
│   │   ┌────────────────┐ │                    │     ('active')       │              │
│   │   │PermissionDenied│ │                    └──────────┬───────────┘              │
│   │   │Strategy :28    │ │                               │                          │
│   │   │                │ │                               │                          │
│   │   │→ audio only    │ │                               │                          │
│   │   └────────────────┘ │                               │                          │
│   │                      │                               │                          │
│   │   ┌────────────────┐ │                               │                          │
│   │   │DeviceNotFound  │ │                               │                          │
│   │   │Strategy :51    │ │                               │                          │
│   │   │                │ │                               │                          │
│   │   │→ default device│ │                               │                          │
│   │   └────────────────┘ │                               │                          │
│   └──────────────────────┘                               │                          │
│                                                          │                          │
└──────────────────────────────────────────────────────────┼──────────────────────────┘
                                                           │
                                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         РЕЗУЛЬТАТ В КОНТЕКСТЕ                                        │
└─────────────────────────────────────────────────────────────────────────────────────┘

   media-stream.context.tsx:71-73
┌─────────────────────────────────────────────────────────────────────┐
│                      start() callback                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   const newStream = await acquisition.startStream()                 │
│   setStream(newStream)              // ← React state                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│              MediaStreamContext.Provider value                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   {                                                                  │
│     stream: MediaStream | null,    ← Доступен всем потребителям     │
│     error: string | null,                                           │
│     isLoading: boolean,                                              │
│     start, stop                                                      │
│   }                                                                  │
│                                                                      │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    │ useMediaStreamContext()
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DeviceSelector                                  │
│                device-selector.tsx:17                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   const { stream, error, isLoading } = useMediaStreamContext()      │
│                                                                      │
│   <LocalVideo stream={stream} ... />                                │
│                                                                      │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        LocalVideo                                    │
│                  components/local-video.tsx                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   useEffect(() => {                                                  │
│     if (videoRef.current && stream) {                               │
│       videoRef.current.srcObject = stream    ← Привязка к <video>   │
│     }                                                                │
│   }, [stream])                                                       │
│                                                                      │
│   return <video ref={videoRef} autoPlay muted />                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              СВОДКА                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

│ Этап              │ Файл                                   │ Что происходит       │
│───────────────────┼────────────────────────────────────────┼──────────────────────│
│ 1. Mount          │ media-stream.context.tsx:101           │ loadSelectedDevices, │
│                   │                                        │ start()              │
│───────────────────┼────────────────────────────────────────┼──────────────────────│
│ 2. Start stream   │ media-stream.context.tsx:55-88        │ acquisition.start    │
│                   │ manager.ts:64                          │                      │
│───────────────────┼────────────────────────────────────────┼──────────────────────│
│ 3. getUserMedia   │ acquisition.ts:151-221                │ merge constraints,   │
│                   │                                        │ fallback strategies  │
│───────────────────┼────────────────────────────────────────┼──────────────────────│
│ 4. Set state      │ media-stream.context.tsx:73           │ setStream(newStream) │
│───────────────────┼────────────────────────────────────────┼──────────────────────│
│ 5. Render         │ device-selector.tsx:94                │ LocalVideo with      │
│                   │ local-video.tsx                        │ srcObject = stream   │
└───────────────────┴────────────────────────────────────────┴──────────────────────┘
```

## Ключевые файлы

| Файл | Класс/Функция | Роль |
|------|---------------|------|
| `lib/media/acquisition.ts:110` | `MediaAcquisition` | Вызов getUserMedia, fallback стратегии |
| `lib/media/manager.ts:40` | `MediaStreamManager` | Facade, делегирует acquisition |
| `features/media/contexts/media-stream.context.tsx:40` | `MediaStreamProvider` | React state, start на mount |
| `features/media/components/device-selector.tsx:16` | `DeviceSelector` | Потребляет stream из context |
| `components/local-video.tsx` | `LocalVideo` | Привязывает stream к `<video>` |
