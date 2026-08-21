import { useEffect, useMemo, useState } from "react";
import {
  MeshNameInput,
  useFairRng,
  useNamedPeer,
  useRoomSeal,
  useRoster,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

const WISHES_KEY = "mesh-gift-exchange:wishes";

type Props = { room: YRoom | null; config: MeshConfig };

export function buildAssignments(
  ids: readonly string[],
  shuffled: readonly string[],
): Record<string, string> {
  if (ids.length < 2 || shuffled.length !== ids.length) return {};
  const assignments: Record<string, string> = {};
  shuffled.forEach((giver, index) => {
    assignments[giver] = shuffled[(index + 1) % shuffled.length]!;
  });
  return assignments;
}

export function sanitizeWish(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 240);
}

function fallbackName(peerId: string): string {
  return `Guest ${peerId.slice(0, 5)}`;
}

export function Feature({ room, config }: Props) {
  const namedPeer = useNamedPeer(config, room);
  const roster = useRoster(room);
  const [passphrase, setPassphrase] = useState("");
  const [wish, setWish] = useState("");
  const [revision, refresh] = useState(0);
  const seal = useRoomSeal(room && passphrase ? { roomId: room.roomId, passphrase } : null);
  const peerIds = roster.present.length ? roster.present : room ? [room.peerId] : [];
  const fair = useFairRng(room, "mesh-gift-exchange:draw", { peerIds, minContributors: 2 });

  useEffect(() => {
    if (!room) return;
    const wishes = room.doc.getMap<string>(WISHES_KEY);
    const update = () => refresh((value) => value + 1);
    wishes.observe(update);
    return () => wishes.unobserve(update);
  }, [room]);

  const order = fair.seed === null ? [] : fair.shuffle(peerIds);
  const assignments = useMemo(
    () => buildAssignments(peerIds, order),
    [peerIds.join("|"), order.join("|")],
  );
  const recipientId = room ? assignments[room.peerId] : undefined;
  const wishes = room?.doc.getMap<string>(WISHES_KEY);
  const recipientWish =
    recipientId && seal.ready ? seal.decryptText(wishes?.get(recipientId) ?? "") : null;
  const nameOf = (peerId: string) => namedPeer.nameOf(peerId) || fallbackName(peerId);
  void revision;

  const saveWish = () => {
    const note = sanitizeWish(wish);
    if (!room || !seal.ready || !note) return;
    wishes?.set(room.peerId, seal.encrypt(note));
    setWish("");
  };

  return (
    <main className="gift-page">
      <section className="gift-hero" aria-labelledby="gift-title">
        <div>
          <p className="eyebrow">Mesh Gift Exchange</p>
          <h1 id="gift-title">A draw worth keeping secret.</h1>
          <p>
            Everyone contributes to a fair draw. Your recipient is calculated only in your browser,
            never published into the room.
          </p>
        </div>
        <div className="guest-count">
          <strong>{peerIds.length}</strong>
          <span>in the draw</span>
        </div>
      </section>

      <section className="gift-grid" aria-label="Gift exchange">
        <section className="gift-card draw-card" aria-labelledby="draw-title">
          <p className="eyebrow">Your private draw</p>
          <h2 id="draw-title">
            {recipientId
              ? `You give to ${nameOf(recipientId)}`
              : peerIds.length < 2
                ? "Invite one more person"
                : "Everyone is sealing the fair draw"}
          </h2>
          <p className="draw-copy">
            {recipientId
              ? "Keep this card to yourself. It is derived locally from the group’s commit-reveal entropy."
              : `${fair.contributors}/${Math.max(2, peerIds.length)} verified contributions ready.`}
          </p>
          {recipientId && (
            <div className="recipient-wish">
              <span>Wish note</span>
              <p>
                {passphrase
                  ? recipientWish || "No sealed wish note yet."
                  : "Enter the shared passphrase to read their note."}
              </p>
            </div>
          )}
          <button
            className="quiet-button"
            type="button"
            onClick={fair.rerollRound}
            disabled={!room || peerIds.length < 2}
          >
            Start a fresh fair draw
          </button>
        </section>

        <section className="gift-card setup-card" aria-labelledby="setup-title">
          <p className="eyebrow">Join the circle</p>
          <h2 id="setup-title">Name + shared seal</h2>
          <MeshNameInput
            label="Your name"
            value={namedPeer.name}
            onChange={namedPeer.setName}
            placeholder="Who are you gifting?"
            maxLength={32}
          />
          <label className="field-label" htmlFor="seal-passphrase">
            Shared passphrase
          </label>
          <input
            id="seal-passphrase"
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            placeholder="Share outside this room"
            autoComplete="new-password"
          />
          <p className="seal-status">
            {passphrase
              ? seal.ready
                ? `Seal ready · ${seal.fingerprint}`
                : "Deriving room seal…"
              : "Used only to encrypt wish notes."}
          </p>
        </section>

        <section className="gift-card wish-card" aria-labelledby="wish-title">
          <p className="eyebrow">Optional</p>
          <h2 id="wish-title">Leave a wish note</h2>
          <label className="field-label" htmlFor="wish-note">
            Something helpful for your giver
          </label>
          <textarea
            id="wish-note"
            value={wish}
            onChange={(event) => setWish(event.target.value)}
            placeholder="A favorite snack, color, book, or a gift idea…"
            maxLength={240}
            disabled={!seal.ready}
          />
          <button
            className="primary-button"
            type="button"
            onClick={saveWish}
            disabled={!seal.ready || !sanitizeWish(wish)}
          >
            Seal my note
          </button>
          <p className="seal-status">
            The note is AES-GCM encrypted with the room passphrase before it reaches the shared
            room.
          </p>
        </section>

        <section className="gift-card roster-card" aria-labelledby="roster-title">
          <p className="eyebrow">Participants</p>
          <h2 id="roster-title">Everyone contributes</h2>
          <ul>
            {peerIds.map((id) => (
              <li key={id}>
                <span className="avatar">{nameOf(id)[0]?.toUpperCase()}</span>
                {nameOf(id)}
                {id === room?.peerId && <small>you</small>}
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
