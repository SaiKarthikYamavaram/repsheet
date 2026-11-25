import { ComponentType, forwardRef, Ref, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView as WebViewBase, WebViewMessageEvent, WebViewProps } from 'react-native-webview';

import type { Frame } from '@/lib/pose';

// MediaPipe runs on the phone inside the page. The camera never leaves it, but the library and model
// download the first time, so the first check needs internet.
const LIB = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const page = (facing: 'user' | 'environment') => `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;height:100%;background:#000;overflow:hidden}
video,canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
${facing === 'user' ? 'video,canvas{transform:scaleX(-1)}' : ''}
</style></head>
<body><video id="v" autoplay playsinline muted></video><canvas id="c"></canvas>
<script type="module">
const post = (m) => window.ReactNativeWebView.postMessage(JSON.stringify(m));
window.tone = '#ffffff';
const BONES = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
try {
  const { PoseLandmarker, FilesetResolver } = await import('${LIB}/vision_bundle.mjs');
  const v = document.getElementById('v');
  const c = document.getElementById('c');
  const g = c.getContext('2d');
  v.srcObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: '${facing}' }, audio: false });
  await v.play();
  const files = await FilesetResolver.forVisionTasks('${LIB}/wasm');
  const make = (delegate) => PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: '${MODEL}', delegate }, runningMode: 'VIDEO', numPoses: 1 });
  const pose = await make('GPU').catch(() => make('CPU'));
  post({ type: 'ready' });
  let last = -1;
  const loop = () => {
    if (v.currentTime !== last && v.videoWidth) {
      last = v.currentTime;
      const w = v.videoWidth, h = v.videoHeight;
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const lm = pose.detectForVideo(v, performance.now()).landmarks[0];
      g.clearRect(0, 0, w, h);
      const p = lm ? lm.map((q) => [Math.round(q.x * w), Math.round(q.y * h), Math.round((q.visibility || 0) * 100) / 100]) : null;
      if (p) {
        g.strokeStyle = window.tone; g.lineWidth = Math.max(4, w / 120); g.lineCap = 'round';
        for (const [a, b] of BONES) {
          if (p[a][2] < 0.5 || p[b][2] < 0.5) continue;
          g.beginPath(); g.moveTo(p[a][0], p[a][1]); g.lineTo(p[b][0], p[b][1]); g.stroke();
        }
      }
      post({ type: 'frame', p, t: Math.round(performance.now()) });
    }
    requestAnimationFrame(loop);
  };
  loop();
} catch (e) {
  post({ type: 'error', message: String((e && (e.name + ': ' + e.message)) || e) });
}
</script></body></html>`;

export type CameraHandle = { injectJavaScript: (js: string) => void };
// The package types WebView as a plain function component, but it does take a ref.
const WebView = WebViewBase as unknown as ComponentType<WebViewProps & { ref?: Ref<CameraHandle> }>;

export type CameraMessage = { type: 'ready' } | { type: 'frame'; p: Frame | null; t: number } | { type: 'error'; message: string };

export const PoseCamera = forwardRef<CameraHandle, { facing: 'user' | 'environment'; onMessage: (m: CameraMessage) => void }>(
  function PoseCamera({ facing, onMessage }, ref) {
    // A new source object would reload the page and restart the camera, and this re-renders every rep.
    const source = useMemo(() => ({ html: page(facing), baseUrl: 'https://repsheet.local/' }), [facing]);
    return (
      <WebView
        ref={ref}
        // An https base makes the page a secure origin, which the camera requires.
        source={source}
        originWhitelist={['*']}
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        mediaCapturePermissionGrantType="grant"
        onMessage={(e: WebViewMessageEvent) => {
          try { onMessage(JSON.parse(e.nativeEvent.data)); } catch { /* not ours */ }
        }}
        style={styles.web}
      />
    );
  },
);

const styles = StyleSheet.create({ web: { flex: 1, backgroundColor: '#000' } });
