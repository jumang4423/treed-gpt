import React from "react";
import { Storage } from "../helpers/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface UploadImgButtonProps {
  imageUrl: string | null;
  setImgUrl: (url: string) => void;
}

const genRandomFileNameUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    // eslint-disable-next-line no-bitwise
    const r = (Math.random() * 16) | 0;
    // eslint-disable-next-line no-bitwise
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const UploadImgButton: React.FC<UploadImgButtonProps> = ({
  imageUrl,
  setImgUrl,
}) => {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const newFileName =
        genRandomFileNameUUID() + "." + file.name.split(".").pop();
      const storageRef = ref(Storage, "images/" + newFileName);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setImgUrl(url);
    } catch (e) {
      alert("error uploading image: " + e);
      setIsUploading(false);
    }
    setIsUploading(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt="uploaded"
          style={{ width: "32px", height: "16px", marginRight: "8px" }}
          onClick={() => window.open(imageUrl, "_blank")}
        />
      )}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          fontSize: "12px",
          color: isUploading ? "#aaa" : "#000",
          padding: "2px",
          cursor: "pointer",
          pointerEvents: isUploading ? "none" : "auto",
        }}
        onClick={handleClick}
      >
        {isUploading ? "uploading..." : "upload image"}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        style={{ display: "none" }}
      />
    </div>
  );
};

export default UploadImgButton;
