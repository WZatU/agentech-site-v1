# AgiBot X2 Ultra Official Web Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the pinned official AgiBot X2 Ultra URDF/STL model into a self-contained, browser-ready GLB that preserves the real shell geometry and joint hierarchy.

**Architecture:** A dependency-light Python converter parses the official URDF, loads each referenced binary or ASCII STL, creates one glTF node per robot link and one transform node per URDF joint, and writes a raw self-contained GLB. A reproducible glTF-Transform pass performs mesh welding, simplification, deduplication, and compression without replacing the official geometry. A separate preview page loads only the official-derived asset so it cannot be confused with the rejected procedural prototype.

**Tech Stack:** Python 3 standard library, URDF XML, STL, glTF 2.0/GLB, glTF-Transform CLI, `<model-viewer>`.

**Spec:** `public/assets/products/agentech-library/simulator-previews/master/joint-axes/SOURCE.md`

## Global Constraints

- Use the official repository `https://github.com/AgibotTech/agibot_x2_urdf` at commit `77f43eb0904dae4c48ccd9154fee824f8ffd4d38`.
- Convert `X2_URDF-v1.3.0/x2_ultra.urdf`; do not construct the body from spheres, cylinders, boxes, or torus primitives.
- Preserve URDF link and joint names in the GLB node hierarchy for future interaction.
- Keep the rejected procedural GLB untouched and write a new official-derived asset.
- Distribute the upstream Mulan PSL v2 license and source attribution with the derived asset.
- Work in the current checkout because the user explicitly approved the change in the currently running local preview; edit only scoped untracked model files and preserve all unrelated dirty-worktree changes.

---

### Task 1: Executable conversion contract

**Files:**
- Create: `scripts/master-robot-model/test_convert_official_x2.py`
- Create: `scripts/master-robot-model/convert_official_x2.py`

**Interfaces:**
- Consumes: `convert_official_x2.py --urdf PATH --output PATH --manifest PATH --source-revision SHA`
- Produces: a valid GLB 2.0 binary and JSON manifest describing source, link count, joint count, mesh count, and triangle count.

- [ ] **Step 1: Write the failing integration test**

```python
result = subprocess.run([
    sys.executable, str(SCRIPT), "--urdf", str(official_urdf),
    "--output", str(output), "--manifest", str(manifest),
    "--source-revision", OFFICIAL_REVISION,
])
self.assertEqual(result.returncode, 0, result.stderr)
self.assertEqual(document["asset"]["extras"]["sourceRevision"], OFFICIAL_REVISION)
self.assertTrue({"head_yaw_joint", "left_elbow_joint", "right_knee_joint"}.issubset(node_names))
self.assertNotIn("Agentech procedural robot builder", document["asset"]["generator"])
```

- [ ] **Step 2: Run the test to verify the missing converter fails**

Run: `python3 scripts/master-robot-model/test_convert_official_x2.py -v`

Expected: FAIL because `convert_official_x2.py` does not exist.

- [ ] **Step 3: Implement the minimal real converter**

```python
def convert_urdf(urdf_path: Path, output_path: Path, source_revision: str) -> ConversionStats:
    robot = ET.parse(urdf_path).getroot()
    links = parse_links(robot, urdf_path.parent)
    joints = parse_joints(robot)
    document, binary = build_gltf(links, joints, source_revision)
    write_glb(output_path, document, binary)
    return ConversionStats.from_document(document)
```

- [ ] **Step 4: Run the integration test with the pinned official URDF**

Run: `AGIBOT_X2_SOURCE=/tmp/agibot-x2-official.VbjqwS/repo python3 scripts/master-robot-model/test_convert_official_x2.py -v`

Expected: PASS with official source metadata, real joint nodes, embedded binary data, and no primitive-builder generator string.

### Task 2: Web optimization and licensed asset output

**Files:**
- Create: `scripts/master-robot-model/build_official_x2_web.sh`
- Create: `public/assets/products/eaic-hub/master-robot-3d/agibot-x2-official-web.glb`
- Create: `public/assets/products/eaic-hub/master-robot-3d/agibot-x2-official-nodes.json`
- Create: `public/assets/products/eaic-hub/master-robot-3d/OFFICIAL-X2-SOURCE.md`
- Create: `public/assets/products/eaic-hub/master-robot-3d/MULAN-PSL-2.0.txt`

**Interfaces:**
- Consumes: a checked-out pinned upstream repository path in `AGIBOT_X2_SOURCE`.
- Produces: optimized official GLB plus manifest and upstream license/attribution.

- [ ] **Step 1: Add a failing budget assertion**

```python
self.assertLess(output.stat().st_size, 15_000_000)
self.assertGreater(manifest_data["renderedTriangleCount"], 80_000)
```

- [ ] **Step 2: Run the test against the raw conversion**

Run: `AGIBOT_X2_SOURCE=/tmp/agibot-x2-official.VbjqwS/repo python3 scripts/master-robot-model/test_convert_official_x2.py -v`

Expected: FAIL because the raw official meshes exceed the web file-size budget.

- [ ] **Step 3: Implement reproducible optimization**

```sh
python3 scripts/master-robot-model/convert_official_x2.py --urdf "$AGIBOT_X2_SOURCE/X2_URDF-v1.3.0/x2_ultra.urdf" --output "$raw" --manifest "$manifest" --source-revision "$revision"
pnpm dlx @gltf-transform/cli optimize "$raw" "$output" --compress draco --flatten false --join false --simplify false --texture-compress false
```

- [ ] **Step 4: Copy the exact upstream license and write source attribution**

Copy the pinned repository `LICENSE` byte-for-byte to `MULAN-PSL-2.0.txt`; record repository URL, revision, source URDF, conversion command, and material adjustments in `OFFICIAL-X2-SOURCE.md`.

- [ ] **Step 5: Run contract and glTF conformance tests**

Run: `python3 scripts/master-robot-model/test_convert_official_x2.py -v`

Run: `pnpm dlx @gltf-transform/cli validate public/assets/products/eaic-hub/master-robot-3d/agibot-x2-official-web.glb`

Expected: all tests pass; validator reports zero errors.

### Task 3: Isolated visual preview and visual regression

**Files:**
- Create: `scripts/master-robot-model/preview-official.html`
- Create: `public/assets/products/eaic-hub/master-robot-3d/agibot-x2-official-preview.jpg`

**Interfaces:**
- Consumes: `/public/assets/products/eaic-hub/master-robot-3d/agibot-x2-official-web.glb`.
- Produces: a browser preview with orbit/zoom controls and a captured review image.

- [ ] **Step 1: Add a preview contract assertion**

```python
preview = Path(__file__).with_name("preview-official.html").read_text()
self.assertIn("agibot-x2-official-web.glb", preview)
self.assertNotIn("agentech-master-web.glb", preview)
```

- [ ] **Step 2: Run the test to verify the preview is initially absent**

Run: `python3 scripts/master-robot-model/test_convert_official_x2.py -v`

Expected: FAIL because `preview-official.html` does not exist.

- [ ] **Step 3: Create the isolated official-model preview**

Use `<model-viewer camera-controls interaction-prompt="none">` with a neutral studio background, soft shadow, and no automatic full-speed rotation.

- [ ] **Step 4: Inspect the live preview at desktop and mobile widths**

Open: `http://127.0.0.1:8123/scripts/master-robot-model/preview-official.html`

Expected: recognizable AgiBot X2 Ultra shell geometry; black core/head, white limb armor, yellow foot guards; complete body within frame; orbit and zoom remain responsive.

- [ ] **Step 5: Capture the approved-state preview and rerun all checks**

Save the browser screenshot to `public/assets/products/eaic-hub/master-robot-3d/agibot-x2-official-preview.jpg`, rerun the Python test and glTF validator, and inspect the screenshot before reporting completion.
