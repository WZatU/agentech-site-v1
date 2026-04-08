import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 50% 42%, rgba(162, 214, 236, 0.18), transparent 16%), linear-gradient(180deg, #010203 0%, #04070a 100%)",
          color: "#F7FBFE",
          fontFamily: "Arial, sans-serif"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(180deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 20px)",
            opacity: 0.2
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 960,
            height: 340,
            borderRadius: "50%",
            border: "1px solid rgba(148, 196, 222, 0.08)",
            transform: "translate(-50%, -58%)",
            boxShadow:
              "0 0 80px rgba(110, 168, 201, 0.08), inset 0 0 120px rgba(110, 168, 201, 0.04)"
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 680,
            height: 210,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 50% 50%, rgba(205, 240, 255, 0.34), rgba(122, 183, 217, 0.08) 38%, transparent 72%)",
            transform: "translate(-50%, -64%)",
            filter: "blur(10px)"
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            width: "100%",
            height: "100%",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "72px 88px",
            textAlign: "center"
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 126,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#B7ECF7",
              textShadow:
                "0 0 22px rgba(198, 244, 252, 0.3), 0 0 52px rgba(102, 208, 226, 0.2)"
            }}
          >
            AGENTECH
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontSize: 30,
              fontWeight: 500,
              letterSpacing: "0.1em",
              color: "rgba(230, 241, 247, 0.82)",
              textTransform: "uppercase"
            }}
          >
            We Build What Thinks and Moves
          </div>
        </div>
      </div>
    ),
    {
      ...size
    }
  );
}
