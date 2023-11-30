import { FC } from "react";
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from "reactflow";
import Button from "@mui/material/Button";

const CustomEdge: FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const image_url: string | null = data.image_url;

  return (
    <>
      <path id={id} className="react-flow__edge-path" d={edgePath} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            padding: 4,
            maxWidth: 300,
            borderRadius: 5,
            fontSize: 10,
            fontFamily: "Iosevka",
            wordBreak: "break-all",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {image_url && (
            <img
              src={image_url}
              style={{ width: "48px", marginRight: "8px" }}
              onClick={() => window.open(image_url, "_blank")}
            />
          )}
          <div>{data.label}</div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;
