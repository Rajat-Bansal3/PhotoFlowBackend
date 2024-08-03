const express = require("express");
const aws = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const authMiddleware = require("../middleware/auth");
const User = require("../modals/user.model");

const router = express.Router();

const s3Client = new aws.S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_ID,
  region: process.env.REGION,
});

const S3_BUCKET_NAME = process.env.BUCKET_NAME;

const createPresignedPost = (params) => {
  return new Promise((resolve, reject) => {
    s3Client.createPresignedPost(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

router.post("/pre-url", authMiddleware, async (req, res) => {
  const userId = req.user;
  const { numberOfUrls } = req.body;
  try {
    const urls = await Promise.all(
      Array.from({ length: numberOfUrls }).map(async () => {
        const key = `photo/${userId}/${uuidv4()}/image.png`;
        const { url, fields } = await createPresignedPost({
          Bucket: S3_BUCKET_NAME,
          Conditions: [
            ["content-length-range", 0, 5 * 1024 * 1024],
            ["starts-with", "$Content-Type", "image/"],
          ], // 5 MB limit
          Fields: {
            key: `${key}`,
            "Content-Type": "image/png",
          },
          Expires: 3600,
        });
        return { url, fields };
      })
    );

    res.json({ urls });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

//image related routes
router.put("/put", authMiddleware, async (req, res) => {
  const urls = req.body;
  const userId = req.user;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "no user found" });
    const images = urls.map((url) => ({
      url,
      uploadedAt: new Date(), // Optional, you can set the date here if needed
    }));
    user.images.push(...images);
    user.save();
    return res.status(203).json({ message: "images added successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "error updating urls" });
  }
});

router.get("/images", authMiddleware, async (req, res) => {
  console.log(req.user);
  const userId = req.user;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ images: user.images });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/image", authMiddleware, async (req, res) => {
  const userId = req.user;
  const { key } = req.body;

  try {
    await s3Client
      .deleteObject({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      })
      .promise();

    const user = await User.findById(userId);
    user.images = user.images.filter((image) => image.url !== key);
    await user.save();

    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
