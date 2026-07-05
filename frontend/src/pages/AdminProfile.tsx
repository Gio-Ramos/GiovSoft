import type { ChangeEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { Bot, BotMessageSquare, BrainCircuit, Camera, CheckCircle2, CircuitBoard, Cpu, Mail, Save, ShieldCheck, Sparkles, Upload, UserRoundCog } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { AdminUser } from "../lib/adminSession";

const avatarOptions: { id: string; label: string; className: string; Icon: LucideIcon }[] = [
  { id: "bot", label: "Robot", className: "is-blue", Icon: Bot },
  { id: "assistant", label: "Asistente", className: "is-green", Icon: BotMessageSquare },
  { id: "circuit", label: "Circuito", className: "is-purple", Icon: CircuitBoard },
  { id: "neural", label: "Neural", className: "is-orange", Icon: BrainCircuit },
  { id: "core", label: "Núcleo", className: "is-dark", Icon: Cpu },
  { id: "spark", label: "Spark", className: "is-sky", Icon: Sparkles },
];

export default function AdminProfile() {
  const { updateUser, user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarId || "bot");
  const [profileImage, setProfileImage] = useState(user?.profileImage || "");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const SelectedAvatarIcon = avatarOptions.find((avatar) => avatar.id === selectedAvatar)?.Icon || Bot;

  useEffect(() => {
    let active = true;

    api.get<{ user: AdminUser }>("/api/admin/profile")
      .then((response) => {
        if (!active) return;

        updateUser(response.data.user);
        setName(response.data.user.name);
        setSelectedAvatar(response.data.user.avatarId || "bot");
        setProfileImage(response.data.user.profileImage || "");
      })
      .catch(() => {
        if (active) {
          setMessage("No se pudo cargar el perfil desde el servidor.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setProfileImage(String(reader.result || ""));
      setMessage(`Foto lista para guardar: ${file.name}`);
    };
    reader.readAsDataURL(file);
  }

  async function saveProfile() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await api.patch<{ message: string; user: AdminUser }>("/api/admin/profile", {
        avatarId: selectedAvatar,
        name,
        profileImage,
      });

      updateUser(response.data.user);
      setName(response.data.user.name);
      setSelectedAvatar(response.data.user.avatarId || "bot");
      setProfileImage(response.data.user.profileImage || "");
      setMessage(response.data.message);
      window.setTimeout(() => setMessage(""), 2200);
    } catch (error) {
      const response = (error as { response?: { data?: { message?: string } } }).response;
      setMessage(response?.data?.message || "No se pudo guardar el perfil en el servidor.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="profile-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Mi perfil</h2>
          <p>Administra tu información, foto de perfil y avatar dentro del panel.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" disabled={isSaving} onClick={saveProfile} type="button"><Save size={20} /> {isSaving ? "Guardando..." : "Guardar perfil"}</button>
        </div>
      </div>

      {message && <p className={message.includes("No se pudo") ? "admin-form-error" : "admin-form-success"}>{message}</p>}

      <div className="profile-layout">
        <article className="profile-identity-card">
          <div className="profile-photo-preview">
            {profileImage ? (
              <img alt="Foto de perfil" src={profileImage} />
            ) : (
              <span className={`profile-avatar-option ${avatarOptions.find((avatar) => avatar.id === selectedAvatar)?.className || "is-blue"}`}><SelectedAvatarIcon size={46} /></span>
            )}
            <label className="profile-upload-button">
              <Camera size={18} />
              Cambiar foto
              <input accept="image/png,image/jpeg,image/webp" onChange={handleImage} type="file" />
            </label>
          </div>
          <h3>{name || user?.name || "GiovSoft"}</h3>
          <p>{user?.role || "Administrador"}</p>
          <span><ShieldCheck size={16} /> Cuenta {user?.status === "active" ? "activa" : "pendiente"}</span>
        </article>

        <article className="profile-panel">
          <header><div><h3>Información del usuario</h3><p>Datos principales de tu cuenta administrativa.</p></div><UserRoundCog size={21} /></header>
          <div className="settings-form-grid">
            <label><span>Nombre</span><input onChange={(event) => setName(event.target.value)} value={name} /></label>
            <label><span>Correo</span><input defaultValue={user?.email || "admin@giovsoft.com"} readOnly /></label>
            <label><span>Rol</span><input defaultValue={user?.role || "Administrador"} readOnly /></label>
            <label><span>Estado</span><input defaultValue={user?.status || "active"} readOnly /></label>
          </div>
        </article>

        <article className="profile-panel">
          <header><div><h3>Seleccionar avatar</h3><p>Elige un avatar visual cuando no uses foto personalizada.</p></div><Upload size={21} /></header>
          <div className="profile-avatar-grid">
            {avatarOptions.map((avatar) => (
              <button className={selectedAvatar === avatar.id ? "is-selected" : ""} key={avatar.id} onClick={() => { setSelectedAvatar(avatar.id); setProfileImage(""); }} type="button">
                <span className={`profile-avatar-option ${avatar.className}`}><avatar.Icon size={24} /></span>
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
