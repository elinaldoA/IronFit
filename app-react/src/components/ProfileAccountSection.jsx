import { version as APP_VERSION } from '../../package.json';

export default function ProfileAccountSection({
  user, accountOpen, setAccountOpen,
  newEmail, setNewEmail, onUpdateEmail,
  newPassword, setNewPassword, onUpdatePassword,
  onLogout, onDeleteAccount,
}) {
  return (
    <>
      <div className="profile-section">
        <button
          type="button"
          className="profile-section__title"
          onClick={() => setAccountOpen(o => !o)}
        >
          Alterar e-mail / senha {accountOpen ? '▲' : '▼'}
        </button>
        {accountOpen && (
          <>
            <div className="profile-field">
              <label className="profile-field__label" htmlFor="newEmail">Novo e-mail</label>
              <input
                type="email" id="newEmail" className="input input--sm" placeholder={user?.email}
                value={newEmail} onChange={e => setNewEmail(e.target.value)}
              />
              <button className="btn btn--outline btn--sm" onClick={onUpdateEmail}>Atualizar e-mail</button>
            </div>
            <div className="profile-field">
              <label className="profile-field__label" htmlFor="newPassword">Nova senha</label>
              <input
                type="password" id="newPassword" className="input input--sm" placeholder="Mínimo 6 caracteres"
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
              />
              <button className="btn btn--outline btn--sm" onClick={onUpdatePassword}>Atualizar senha</button>
            </div>
          </>
        )}
      </div>

      <button className="btn btn--outline btn--full" onClick={onLogout}>Sair da conta</button>
      <button className="btn btn--ghost btn--full" onClick={onDeleteAccount}>Excluir conta</button>
      <p className="app-version">IronFit v{APP_VERSION}</p>
    </>
  );
}
