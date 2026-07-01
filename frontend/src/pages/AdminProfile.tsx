import type { ChangeEvent } from "react";
import { Camera, CheckCircle2, Mail, Save, ShieldCheck, Upload, UserRoundCog } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../lib/auth";

const avatarOptions = [
  { id: "blue", label: "Azul", className: "is-blue" },
  { id: "green", label: "Verde", className: "is-green" },
  { id: "purple", label: "Morado", className: "is-purple" },
  { id: "orange", label: "Naranja", className: "is-orange" },
  { id: "dark", label: "Oscuro", className: "is-dark" },
  { id: "sky", label: "Cielo", className: "is-sky" },
];

export default function AdminProfile() {
  const { user } = useAuth();
  const [selectedAvatar, setSelectedAvatar] = useState("blue");
  const [profileImage, setProfileImage] = useState("");
  const [message, setMessage] = useState("");

  const initials = useMemo(() => {
    const name = user?.name || "GiovSoft";
    return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  }, [user?.name]);

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setProfileImage(URL.createObjectURL(file));
    setMessage(`Foto seleccionada: ${file.name}`);
  }

  function saveProfile() {
    setMessage("Perfil actualizado para esta sesión.");
    window.setTimeout(() => setMessage(""), 2200);
  }

  return (
    <section className="profile-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Mi perfil</h2>
          <p>Administra tu información, foto de perfil y avatar dentro del panel.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" onClick={saveProfile} type="button"><Save size={20} /> Guardar perfil</button>
        </div>
      </div>

      {message && <p className="admin-form-success">{message}</p>}

      <div className="profile-layout">
        <article className="profile-identity-card">
          <div className="profile-photo-preview">
            {profileImage ? (
              <img alt="Foto de perfil" src={profileImage} />
            ) : (
              <span className={`profile-avatar-option ${avatarOptions.find((avatar) => avatar.id === selectedAvatar)?.className || "is-blue"}`}>{initials}</span>
            )}
            <label className="profile-upload-button">
              <Camera size={18} />
              Cambiar foto
              <input accept="image/png,image/jpeg,image/webp" onChange={handleImage} type="file" />
            </label>
          </div>
          <h3>{user?.name || "GiovSoft"}</h3>
          <p>{user?.role || "Administrador"}</p>
          <span><ShieldCheck size={16} /> Cuenta {user?.status === "active" ? "activa" : "pendiente"}</span>
        </article>

        <article className="profile-panel">
          <header><div><h3>Información del usuario</h3><p>Datos principales de tu cuenta administrativa.</p></div><UserRoundCog size={21} /></header>
          <div className="settings-form-grid">
            <label><span>Nombre</span><input defaultValue={user?.name || "GiovSoft"} /></label>
            <label><span>Correo</span><input defaultValue={user?.email || "admin@giovsoft.com"} /></label>
            <label><span>Rol</span><input defaultValue={user?.role || "Administrador"} readOnly /></label>
            <label><span>Estado</span><input defaultValue={user?.status || "active"} readOnly /></label>
          </div>
        </article>

        <article className="profile-panel">
          <header><div><h3>Seleccionar avatar</h3><p>Elige un avatar visual cuando no uses foto personalizada.</p></div><Upload size={21} /></header>
          <div className="profile-avatar-grid">
            {avatarOptions.map((avatar) => (
              <button className={selectedAvatar === avatar.id ? "is-selected" : ""} key={avatar.id} onClick={() => { setSelectedAvatar(avatar.id); setProfileImage(""); }} type="button">
                <span className={`profile-avatar-option ${avatar.className}`}>{initials}</span>
                <small>{avatar.label}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="profile-panel">
          <header><div><h3>Seguridad de la cuenta</h3><p>Resumen de acceso y políticas activas.</p></div><CheckCircle2 size={21} /></header>
          <div className="settings-security-list">
            <span><Mail size={18} /> Correo verificado: {user?.email || "admin@giovsoft.com"}</span>
            <span><ShieldCheck size={18} /> Rol actual: {user?.role || "Administrador"}</span>
            <span><CheckCircle2 size={18} /> Cambio obligatorio de contraseña: {user?.passwordChangeRequired ? "Sí" : "No"}</span>
          </div>
        </article>
      </div>
    </section>
  );
}
