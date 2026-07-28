# Navi stand simulation

This folder stores the approved website simulation source for
`Agentech.stand()` on Navi.

- Motion: low four-foot crouch, then rise to the verified standing target.
- Timing: 0.75-second crouch hold, 1.5-second rise, 1.5-second standing hold.
- Control: the 12 leg torque actuators only; the root pose is initialized once
  and is not driven during the motion.
- Website asset:
  `public/assets/products/agentech-library/simulator-previews/navi/stand/navi-stand-up.mp4`

Regenerate from the extracted Navi MuJoCo model package:

```powershell
python scripts/simulator-previews/navi/stand/render_navi_stand_preview.py `
  --model-root C:\path\to\Navi_MuJoCo `
  --output public/assets/products/agentech-library/simulator-previews/navi/stand/navi-stand-up.mp4
```
