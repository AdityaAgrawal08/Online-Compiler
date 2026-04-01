import { useState } from "react";

type DrawerFile = {
  id: string;
  name: string;
  isDirty?: boolean;
};

type FileDrawerProps = {
  open: boolean;
  files: DrawerFile[];
  activeFileId: string;
  onClose: () => void;
  onSelect: (fileId: string) => void;
  onCreate: () => void;
  onRename: (fileId: string, nextName: string) => void;
  onDelete: (fileId: string) => void;
};

export function FileDrawer({
  open,
  files,
  activeFileId,
  onClose,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: FileDrawerProps) {
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");

  const startRename = (fileId: string, currentName: string) => {
    setEditingId(fileId);
    setEditingName(currentName);
  };

  const submitRename = () => {
    const sanitized = editingName.trim();
    if (!sanitized || !editingId) {
      setEditingId("");
      setEditingName("");
      return;
    }

    onRename(editingId, sanitized);
    setEditingId("");
    setEditingName("");
  };

  return (
    <>
      <div
        className={`drawer-overlay ${open ? "is-open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`file-drawer ${open ? "is-open" : ""}`}>
        <div className="file-drawer-header">
          <h2>Files</h2>
          <button type="button" className="ghost-button" onClick={onCreate}>
            New
          </button>
        </div>
        <div className="file-list">
          {files.map((file) => (
            <div
              key={file.id}
              className={`file-item ${file.id === activeFileId ? "is-active" : ""}`}
            >
              {editingId === file.id ? (
                <div className="file-edit-row">
                  <input
                    className="file-name-input"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        submitRename();
                      }

                      if (event.key === "Escape") {
                        setEditingId("");
                        setEditingName("");
                      }
                    }}
                    autoFocus
                  />
                  <button type="button" className="mini-button" onClick={submitRename}>
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="file-item-main"
                    onClick={() => onSelect(file.id)}
                  >
                    <span>{file.name}</span>
                    {file.isDirty ? <span className="dirty-indicator">*</span> : null}
                  </button>

                  <div className="file-item-actions">
                    <button
                      type="button"
                      className="mini-button"
                      onClick={() => startRename(file.id, file.name)}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="mini-button danger"
                      onClick={() => onDelete(file.id)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
