import { brandMarkPath } from "@qntx-ui/content";
import type { ReactElement } from "react";
import Svg, { Path } from "react-native-svg";

export function BrandMark({ color, size = 32 }: { color: string; size?: number }): ReactElement {
  return (
    <Svg width={size} height={size} viewBox="-150 -150 300 300">
      <Path d={brandMarkPath} fill={color} fillRule="evenodd" />
    </Svg>
  );
}
