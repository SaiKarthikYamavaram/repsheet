import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Polygon, Polyline, Stop, Text as SvgText } from 'react-native-svg';

import { fmtKg } from '@/lib/logic';
import { colors, fonts } from '@/theme';

export function LineChart({ points, height = 190 }: { points: number[]; height?: number }) {
  const [width, setWidth] = useState(0);
  const left = 34, top = 10, bottom = 10, right = 8;
  let lo = Math.floor(Math.min(...points));
  let hi = Math.ceil(Math.max(...points));
  if (lo === hi) { lo -= 5; hi += 5; }
  const x = (i: number) => left + (i * (width - left - right)) / (points.length - 1);
  const y = (v: number) => top + ((hi - v) * (height - top - bottom)) / (hi - lo);
  const line = points.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const end = points[points.length - 1];
  return (
    <View accessibilityLabel={`Chart from ${fmtKg(points[0])} to ${fmtKg(end)} kg`} style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.amber} />
              <Stop offset="0.55" stopColor={colors.coral} />
              <Stop offset="1" stopColor={colors.rose} />
            </LinearGradient>
            <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.coral} stopOpacity={0.42} />
              <Stop offset="1" stopColor={colors.coral} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[lo, (lo + hi) / 2, hi].map((v) => (
            <Line key={v} x1={left} x2={width} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.1)" />
          ))}
          {[lo, (lo + hi) / 2, hi].map((v) => (
            <SvgText key={v} x={0} y={y(v) + 4} fill={colors.muted} fontSize={11} fontFamily={fonts.body}>{fmtKg(v)}</SvgText>
          ))}
          <Polygon fill="url(#fill)" points={`${x(0)},${height - bottom} ${line} ${x(points.length - 1)},${height - bottom}`} />
          <Polyline fill="none" stroke={points.every((p) => p === end) ? colors.coral : 'url(#stroke)'} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" points={line} />
          <Circle cx={x(points.length - 1)} cy={y(end)} r={5.5} fill={colors.rose} stroke="#fff" strokeWidth={2} />
        </Svg>
      )}
    </View>
  );
}
