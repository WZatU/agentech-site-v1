# Official AgiBot X2 Ultra web model source

- Upstream repository: <https://github.com/AgibotTech/agibot_x2_urdf>
- Pinned revision: `77f43eb0904dae4c48ccd9154fee824f8ffd4d38`
- Source model: `X2_URDF-v1.3.0/x2_ultra.urdf`
- Source geometry: all visible meshes referenced by the official URDF (`X2_URDF-v1.3.0/meshes/*.STL`)
- Upstream license: Mulan PSL v2; the exact upstream license is included as `MULAN-PSL-2.0.txt`.

## Web conversion

The derived GLB retains the official link and joint names as glTF nodes. The
source meshes are decimated to 30% of their original triangle counts, with a
minimum of 750 faces per source mesh, then welded and Draco-compressed. The
optimizer is explicitly configured not to flatten or join the scene graph so
the URDF articulation hierarchy remains available for interaction.

No sphere, cylinder, box, torus, or other procedural geometry replaces the
robot body. The only visual changes are PBR material assignments informed by
the supplied photographs: carbon-black core/head/torso, warm-white armor, and
safety-yellow foot guards.

Build command:

```sh
AGIBOT_X2_SOURCE=/path/to/pinned/agibot_x2_urdf \
MODEL_PYTHON=/path/to/python-with-model-requirements \
PNPM_BIN=/path/to/pnpm \
scripts/master-robot-model/build_official_x2_web.sh
```
