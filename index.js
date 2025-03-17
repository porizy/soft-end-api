import express from "express";
import multer from "multer";
import cors from "cors";
import { Sequelize, Model, DataTypes, where } from "sequelize";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const port = process.env.PORT || 5000;
const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: "./database/nas_db.sqlite",
});
const upload = multer({ storage: multer.memoryStorage() });

class Users extends Model {}
class Files extends Model {}
Users.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        username: DataTypes.STRING,
        password: DataTypes.STRING,
    },
    { sequelize, modelName: "users" }
);
Files.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        author_id: {
            type: DataTypes.INTEGER,
            references: { model: "users", key: "id" },
        },
        file_name: DataTypes.STRING,
        file_type: DataTypes.STRING,
        file_data: DataTypes.BLOB,
        description: DataTypes.STRING,
    },
    { sequelize, modelName: "files" }
);
sequelize.sync();

app.post("/api/signup", async (req, res) => {
    const { username, password, confirm_passwd } = req.body;
    if (password !== confirm_passwd) {
        res.status(400).json({
            status: "400 Bad Request",
            message: "รหัสผ่านไม่ตรงกันกรุณาลองใหม่อีกครั้ง",
        });
    } else {
        const user = await Users.create({
            username: username,
            password: password,
        });
        res.status(201).json({
            status: "201 Created",
            message: "สมัครสมาชิกสำเร็จ",
            data: user,
        });
    }
});

app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    if (
        !username ||
        username === undefined ||
        (username === "" && !password) ||
        password === undefined ||
        password === ""
    ) {
        res.status(400).json({
            status: "400 Bad Request",
            message: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
        });
    } else {
        const user = await Users.findOne({
            where: { username: username, password: password },
        });
        if (user) {
            res.status(200).json({
                status: true,
                message: "เข้าสู่ระบบสำเร็จ",
                data: { id: user.id, username: user.username },
            });
        } else {
            res.status(204).json({
                status: false,
                message: "ไม่พบข้อมูลผู้ใช้งานในระบบ",
            });
        }
    }
});

app.get("/api/user", async (req, res) => {
    const params = req.query;
    if (!params.id || params.id === "" || params.id === undefined) {
        res.status(204).json({});
    } else {
        const user = await Users.findOne({
            where: { id: params.id },
            attributes: ["username"],
        });
        res.status(302).json({
            status: "302 Found",
            message: "เรียกดูข้อมูลสำเร็จ",
            data: user,
        });
    }
});

app.post("/api/file", upload.single("file"), async (req, res) => {
    const { description } = req.body;
    const params = req.query;
    const file = req.file;
    if (!file) {
        res.status(400).json({
            status: "400 Bad Request",
            message: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        });
    } else {
        const file_upload = await Files.create({
            author_id: params.id,
            file_name: file.originalname,
            file_type: file.mimetype,
            file_data: file.buffer,
            description: description,
        });
        if (!file_upload) {
            res.status(400).json({
                status: "500 Internal Server Error",
                message: "เกิดข้อผิดพลาดในการทำงานของเซิฟเวอร์",
            });
        } else {
            res.status(201).json({
                status: "201 Created",
                message: "อัพโหลดข้อมูลสำเร็จ",
            });
        }
    }
});

app.put("/api/file", async (req, res) => {
    const params = req.query;
    const { file_id, description } = req.body;
    if (!params.id || params.id === "" || params.id === undefined) {
        res.status(204).json({ message: "ไม่พบข้อมูล" });
    } else {
        await Files.update({ description: description }, { where: { id: file_id } });
        res.status(200).json({ status: "200 OK", message: "อัปเดตข้อมูลสำเร็จ" });
    }
});

app.delete("/api/file", async (req, res) => {
    const params = req.query;
    const { file_id } = req.body;
    if (!params.id || params.id === "" || params.id === undefined) {
        res.status(204).json({ message: "ไม่พบข้อมูล" });
    } else {
        await Files.destroy({ where: { id: file_id } });
        res.status(200).json({ status: "200 OK", message: "ลบข้อมูลสำเร็จ" });
    }
});

app.get("/api/file", async (req, res) => {
    const params = req.query;
    if (!params.id || params.id === "" || params.id === undefined) {
        res.status(204).json({ message: "ไม่พบข้อมูล" });
    } else {
        const files = await Files.findAll({ where: { author_id: params.id } });
        const file = files.map((file) => {
            return {
                id: file.id,
                file_name: file.file_name,
                description: file.description,
                file_data: file.file_data.toString("base64"),
                file_type: file.file_type,
            };
        });
        res.status(302).json({
            status: "302 Found",
            message: "เรียกดูข้อมูลสำเร็จ",
            data: file,
        });
    }
});

app.listen(port, () => {
    console.log(`Server is listening on ${port}`);
});
