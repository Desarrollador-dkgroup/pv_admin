"use client";

import { useState } from "react";
import { X, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui";

export type Attraction = {
  id: string;
  name: string;
  description: string;
  photos: Array<{
    storage_path?: string;
    position: number;
    alt_text?: string;
  }>;
};

type Props = {
  attractions: Attraction[];
  onAttractionsChange: (attractions: Attraction[]) => void;
};

// Editor de atracciones para actividades
export function AttractionsField({ attractions, onAttractionsChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const addAttraction = () => {
    const newId = `attr-${Date.now()}`;
    const newAttraction: Attraction = {
      id: newId,
      name: "",
      description: "",
      photos: [],
    };
    onAttractionsChange([...attractions, newAttraction]);
    setEditingId(newId);
  };

  const updateAttraction = (id: string, updates: Partial<Attraction>) => {
    onAttractionsChange(
      attractions.map((attr) => (attr.id === id ? { ...attr, ...updates } : attr))
    );
  };

  const removeAttraction = (id: string) => {
    onAttractionsChange(attractions.filter((attr) => attr.id !== id));
  };

  return (
    <div className="field">
      <label>Atracciones principales</label>
      <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: 16 }}>
        Agrega las atracciones principales de tu actividad. Cada una puede incluir
        descripción y hasta 5 fotos.
      </p>

      {attractions.map((attraction) => (
        <AttractionEditor
          key={attraction.id}
          attraction={attraction}
          isEditing={editingId === attraction.id}
          onEdit={() => setEditingId(attraction.id)}
          onClose={() => setEditingId(null)}
          onUpdate={(updates) => updateAttraction(attraction.id, updates)}
          onRemove={() => removeAttraction(attraction.id)}
        />
      ))}

      {attractions.length === 0 && (
        <div
          style={{
            padding: 16,
            textAlign: "center",
            color: "var(--muted)",
            borderRadius: 8,
            backgroundColor: "var(--background-secondary)",
            marginBottom: 16,
          }}
        >
          No hay atracciones agregadas
        </div>
      )}

      <Button
        type="button"
        onClick={addAttraction}
        style={{ width: "100%" }}
      >
        <Plus size={16} /> Agregar atracción
      </Button>
    </div>
  );
}

type AttractionEditorProps = {
  attraction: Attraction;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onUpdate: (updates: Partial<Attraction>) => void;
  onRemove: () => void;
};

function AttractionEditor({
  attraction,
  isEditing,
  onEdit,
  onClose,
  onUpdate,
  onRemove,
}: AttractionEditorProps) {
  if (!isEditing) {
    return (
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: 12,
          backgroundColor: "var(--background-secondary)",
          borderRadius: 8,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>
            {attraction.name || "Atracción sin nombre"}
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              color: "var(--muted)",
              marginTop: 4,
            }}
          >
            {attraction.photos.length} foto(s) • {attraction.description.length} caracteres
          </div>
        </div>
        <Button
          type="button"
          tone="quiet"
          onClick={onEdit}
          style={{ padding: 8 }}
        >
          Editar
        </Button>
        <Button
          type="button"
          tone="quiet"
          onClick={onRemove}
          style={{ padding: 8, color: "var(--error)" }}
        >
          <X size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 16,
        backgroundColor: "var(--background-secondary)",
        borderRadius: 8,
        marginBottom: 12,
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Editar atracción</h3>
        <Button
          type="button"
          tone="quiet"
          onClick={onClose}
          style={{ padding: 4 }}
        >
          <X size={16} />
        </Button>
      </div>

      <label className="field">
        Nombre de la atracción
        <input
          type="text"
          value={attraction.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Ej: Cascada Chiquita"
          maxLength={100}
        />
      </label>

      <label className="field">
        Descripción
        <textarea
          value={attraction.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Describe esta atracción..."
          rows={4}
          maxLength={500}
        />
        <small style={{ color: "var(--muted)" }}>
          {attraction.description.length}/500 caracteres
        </small>
      </label>

      <PhotoGalleryField
        photos={attraction.photos}
        onPhotosChange={(photos) => onUpdate({ photos })}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <Button type="button" tone="primary" onClick={onClose} style={{ flex: 1 }}>
          Listo
        </Button>
        <Button
          type="button"
          tone="secondary"
          onClick={onRemove}
          style={{ flex: 1, color: "var(--error)" }}
        >
          Eliminar atracción
        </Button>
      </div>
    </div>
  );
}

type PhotoGalleryFieldProps = {
  photos: Attraction["photos"];
  onPhotosChange: (photos: Attraction["photos"]) => void;
};

function PhotoGalleryField({ photos, onPhotosChange }: PhotoGalleryFieldProps) {
  const handleAddPhoto = () => {
    if (photos.length < 5) {
      const newPhoto = {
        position: (Math.max(...photos.map((p) => p.position), 0) + 1),
        alt_text: "",
      };
      onPhotosChange([...photos, newPhoto]);
    }
  };

  const handleRemovePhoto = (position: number) => {
    onPhotosChange(photos.filter((p) => p.position !== position));
  };

  const handleUpdatePhoto = (position: number, updates: Partial<typeof photos[0]>) => {
    onPhotosChange(
      photos.map((p) =>
        p.position === position ? { ...p, ...updates } : p
      )
    );
  };

  return (
    <div className="field">
      <label>Galería de fotos (máximo 5)</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 120px)", gap: 12, marginBottom: 12 }}>
        {photos.map((photo) => (
          <div
            key={photo.position}
            style={{
              position: "relative",
              aspectRatio: "1",
              backgroundColor: "var(--background)",
              borderRadius: 8,
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {photo.storage_path ? (
              <>
                <img
                  src={photo.storage_path}
                  alt={photo.alt_text || `Foto ${photo.position}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.position)}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    background: "rgba(0,0,0,0.6)",
                    border: "none",
                    color: "white",
                    borderRadius: 4,
                    padding: 4,
                    cursor: "pointer",
                    display: "flex",
                  }}
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <label
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                <Upload size={20} />
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        handleUpdatePhoto(photo.position, {
                          storage_path: event.target?.result as string,
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      {photos.length < 5 && (
        <Button
          type="button"
          onClick={handleAddPhoto}
          style={{ width: "100%" }}
        >
          <Plus size={16} /> Agregar foto
        </Button>
      )}
    </div>
  );
}
