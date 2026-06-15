import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get("name") ?? "Người chơi";
  const rank = searchParams.get("rank") ?? "?";
  const points = searchParams.get("points") ?? "0";

  const pointsNum = parseInt(points, 10);
  const pointsFormatted = isNaN(pointsNum)
    ? points
    : pointsNum.toLocaleString("vi-VN");

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f2d5e 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decoration circles */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(255, 215, 0, 0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(255, 215, 0, 0.04)",
          }}
        />

        {/* Top badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "32px",
          }}
        >
          <span style={{ fontSize: "48px" }}>👑</span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#fbbf24",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Đường Đến Ngai Vàng
            </span>
            <span
              style={{
                fontSize: "16px",
                color: "#93c5fd",
                fontWeight: "400",
              }}
            >
              World Cup 2026
            </span>
          </div>
        </div>

        {/* Player name */}
        <div
          style={{
            fontSize: "42px",
            fontWeight: "700",
            color: "#ffffff",
            textAlign: "center",
            maxWidth: "900px",
            marginBottom: "32px",
            lineHeight: "1.2",
          }}
        >
          {name}
        </div>

        {/* Rank + Points row */}
        <div
          style={{
            display: "flex",
            gap: "60px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Rank */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                fontSize: "80px",
                fontWeight: "900",
                color: "#fbbf24",
                lineHeight: "1",
                letterSpacing: "-2px",
              }}
            >
              #{rank}
            </span>
            <span style={{ fontSize: "16px", color: "#94a3b8", fontWeight: "500" }}>
              Hạng
            </span>
          </div>

          {/* Divider */}
          <div
            style={{
              width: "2px",
              height: "80px",
              background: "rgba(255,255,255,0.15)",
            }}
          />

          {/* Points */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                fontSize: "80px",
                fontWeight: "900",
                color: "#34d399",
                lineHeight: "1",
                letterSpacing: "-2px",
              }}
            >
              {pointsFormatted}đ
            </span>
            <span style={{ fontSize: "16px", color: "#94a3b8", fontWeight: "500" }}>
              Điểm
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "13px", color: "#64748b" }}>
            điểm ảo · chơi cho vui · winningworldcup26
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
