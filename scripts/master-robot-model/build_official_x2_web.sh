#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
source_root=${AGIBOT_X2_SOURCE:?Set AGIBOT_X2_SOURCE to the pinned AgibotTech/agibot_x2_urdf checkout}
model_python=${MODEL_PYTHON:-python3}
pnpm_bin=${PNPM_BIN:-pnpm}
revision=77f43eb0904dae4c48ccd9154fee824f8ffd4d38

actual_revision=$(git -C "$source_root" rev-parse HEAD)
if [ "$actual_revision" != "$revision" ]; then
  echo "Expected official source revision $revision, got $actual_revision" >&2
  exit 1
fi

work_dir=$(mktemp -d /tmp/agibot-x2-web-build.XXXXXX)
cleanup() {
  rm -rf -- "$work_dir"
}
trap cleanup EXIT HUP INT TERM

output_dir="$project_root/public/assets/products/eaic-hub/master-robot-3d"
output_glb="$output_dir/agibot-x2-official-web.glb"
output_manifest="$output_dir/agibot-x2-official-nodes.json"
simplified_source="$work_dir/X2_URDF-v1.3.0"
raw_glb="$work_dir/agibot-x2-official-raw.glb"
raw_manifest="$work_dir/agibot-x2-official-raw.json"

mkdir -p "$output_dir"

"$model_python" "$project_root/scripts/master-robot-model/simplify_official_x2_meshes.py" \
  --model-dir "$source_root/X2_URDF-v1.3.0" \
  --output-dir "$simplified_source" \
  --ratio 0.30 \
  --minimum-faces 750

python3 "$project_root/scripts/master-robot-model/convert_official_x2.py" \
  --urdf "$simplified_source/x2_ultra.urdf" \
  --output "$raw_glb" \
  --manifest "$raw_manifest" \
  --source-revision "$revision"

PATH="$(dirname "$(command -v node)"):$PATH" "$pnpm_bin" dlx @gltf-transform/cli optimize \
  "$raw_glb" "$output_glb" \
  --compress draco \
  --flatten false \
  --join false \
  --instance false \
  --palette false \
  --simplify false \
  --texture-compress false

python3 "$project_root/scripts/master-robot-model/inspect_official_x2_glb.py" \
  --glb "$output_glb" \
  --base-manifest "$raw_manifest" \
  --output "$output_manifest"

cp "$source_root/LICENSE" "$output_dir/MULAN-PSL-2.0.txt"
echo "Built $output_glb"
