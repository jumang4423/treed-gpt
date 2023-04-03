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
            fontSize: 8,
            fontFamily: "Iosevka",
            wordBreak: "break-all",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {data.label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;
