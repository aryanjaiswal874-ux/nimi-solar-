import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const User = sequelize.define("User", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    full_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    mobile: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM("user", "admin", "partner", "employee", "super_admin"),
        defaultValue: "user",
    },
    address: {
        type: DataTypes.JSON, // { line1, city, state, pincode }
        allowNull: true,
    },
    profile_photo: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    secondary_mobiles: {
        type: DataTypes.JSON, // Array of strings
        allowNull: true,
    },
    secondary_emails: {
        type: DataTypes.JSON, // Array of strings
        allowNull: true,
    },
    bank_details: {
        type: DataTypes.JSON, // { account_holder, account_number, bank_name, ifsc }
        allowNull: true,
    },
    designation: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    state: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    pincode: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    qualification: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    age: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    gender: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    is_partner_application_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    employee_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    smartflo_agent_id: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    call_access: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    smartflo_caller_id: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    work_mode: {
        type: DataTypes.ENUM("Office", "Remote"),
        defaultValue: "Office",
    },
    gross_salary: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    joining_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    upi_id: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    office_in_time: {
        type: DataTypes.TIME,
        allowNull: true,
    },
    office_out_time: {
        type: DataTypes.TIME,
        allowNull: true,
    },
    week_offs: {
        type: DataTypes.JSON, // Array of strings like ["Sunday"]
        allowNull: true,
    },
    sunday_in_time: {
        type: DataTypes.TIME,
        allowNull: true,
    },
    sunday_out_time: {
        type: DataTypes.TIME,
        allowNull: true,
    },
    // Refresh token for JWT rotation
    refresh_token: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    refresh_token_expires: {
        type: DataTypes.DATE,
        allowNull: true,
    },
});

export default User;
