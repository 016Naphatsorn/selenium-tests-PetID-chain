
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

app.get("/", (req, res) => {
  res.send("PetID Chain Backend is running");
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "กรุณาเลือกไฟล์รูปภาพ",
      });
    }

    const formData = new FormData();

    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    formData.append("network", "public");

    const response = await axios.post(
      "https://uploads.pinata.cloud/v3/files",
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
          ...formData.getHeaders(),
        },
      }
    );

    const cid = response.data.data.cid;

    res.json({
      success: true,
      cid,
      imageURI: `ipfs://${cid}`,
      gateway: `https://gateway.pinata.cloud/ipfs/${cid}`,
    });
  } catch (error) {
    console.error(error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: "อัปโหลดรูปไป Pinata ไม่สำเร็จ",
    });
  }
});

app.listen(PORT, () => {
  console.log(`PetID Chain Backend running on http://localhost:${PORT}`);
});

