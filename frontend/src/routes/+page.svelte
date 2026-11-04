<script>
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  const API = browser ? `http://${location.hostname}:3000` : "";

  let visning = $state("login");
  let brukernavnFelt = $state("");
  let passordFelt = $state("");
  let loginFeil = $state("");

  let token = $state(null);
  let megSelv = $state("");
  let meuId = $state("");

  let brukere = $state([]);
  let sok = $state("");
  let valgtMottaker = $state(null);

  let meldinger = $state([]);
  let tekst = $state("");
  let status = $state("");

  let perfilAberto = $state(null);

  let brukereFiltrert = $derived(
    brukere.filter(b =>
      b.brukernavn.toLowerCase().includes(sok.trim().toLowerCase())
    )
  );

  function headers() {
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  async function logInn() {
    loginFeil = "";
    try {
      const svar = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brukernavn: brukernavnFelt, passord: passordFelt })
      });
      const data = await svar.json();
      if (!svar.ok) throw new Error(data.beskjed);
      token = data.token;
      megSelv = data.brukernavn;
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("brukernavn", megSelv);
      visning = "chat";
      passordFelt = "";
      await hentBrukere();
      await hentMeldinger();
    } catch (e) {
      loginFeil = e.message;
    }
  }

  async function opprettKonto() {
    loginFeil = "";
    try {
      const svar = await fetch(`${API}/registrer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brukernavn: brukernavnFelt, passord: passordFelt })
      });
      const data = await svar.json();
      if (!svar.ok) throw new Error(data.beskjed);
      await logInn();
    } catch (e) {
      loginFeil = e.message;
    }
  }

  function loggUt() {
    token = null;
    megSelv = "";
    meuId = "";
    visning = "login";
    meldinger = [];
    valgtMottaker = null;
    perfilAberto = null;
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("brukernavn");
  }

  async function hentBrukere() {
    const svar = await fetch(`${API}/brukere`, { headers: headers() });
    if (svar.ok) {
      brukere = await svar.json();
      const meu = brukere.find(b => b.brukernavn === megSelv);
      if (meu) meuId = meu.id;
    }
  }

  async function hentMeldinger() {
    try {
      const sti = valgtMottaker
        ? `/meldinger/privat/${encodeURIComponent(valgtMottaker)}`
        : `/meldinger/generelt`;
      const svar = await fetch(`${API}${sti}`, { headers: headers() });
      if (!svar.ok) throw new Error(`HTTP ${svar.status}`);
      meldinger = await svar.json();
    } catch (e) {
      status = `Kunne ikke hente: ${e.message}`;
    }
  }

  function velgGenerelt() {
    perfilAberto = null;
    valgtMottaker = null;
    hentMeldinger();
  }

  function velgBruker(brukernavn) {
    perfilAberto = null;
    valgtMottaker = brukernavn;
    hentMeldinger();
  }

  function abrirPerfil(bruker, e) {
    e.stopPropagation();
    perfilAberto = bruker;
  }

  function fecharPerfil() {
    perfilAberto = null;
  }

  async function sendMelding() {
    if (!tekst.trim()) return;
    try {
      const svar = await fetch(`${API}/meldinger`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ tekst, til: valgtMottaker })
      });
      const data = await svar.json();
      if (!svar.ok) throw new Error(data.beskjed);
      tekst = "";
      status = "";
      await hentMeldinger();
    } catch (e) {
      status = `Kunne ikke sende: ${e.message}`;
    }
  }

  async function gjenopprettOkt() {
    const lagretToken = sessionStorage.getItem("token");
    const lagretBrukernavn = sessionStorage.getItem("brukernavn");
    if (!lagretToken || !lagretBrukernavn) return;

    token = lagretToken;
    megSelv = lagretBrukernavn;
    visning = "chat";
    await hentBrukere();
    await hentMeldinger();
  }

  onMount(() => {
    gjenopprettOkt();

    const id = setInterval(() => {
      if (token) {
        hentBrukere();
        hentMeldinger();
      }
    }, 3000);
    return () => clearInterval(id);
  });
</script>
{#if visning === "login" || visning === "registrer"}
  <div class="login-side">
    <div class="flor flor-topo-esquerda">
      <div class="petala petala-1"></div>
      <div class="petala petala-2"></div>
      <div class="petala petala-3"></div>
    </div>

    <div class="login-boks">
      <h1>{visning === "login" ? "Login" : "Opprett konto"}</h1>

      <label for="brukernavn">Brukernavn</label>
      <input id="brukernavn" bind:value={brukernavnFelt} placeholder="Brukernavn" />

      <label for="passord">Passord</label>
      <input id="passord" type="password" bind:value={passordFelt} placeholder="Passord"
        onkeydown={(e) => e.key === "Enter" && (visning === "login" ? logInn() : opprettKonto())} />

      {#if visning === "login"}
        <button class="go" onclick={logInn}>go</button>
        <button type="button" class="lenke" onclick={() => (visning = "registrer")}>Create account</button>
      {:else}
        <button class="go" onclick={opprettKonto}>go</button>
        <button type="button" class="lenke" onclick={() => (visning = "login")}>Har allerede konto? Logg inn</button>
      {/if}

      {#if loginFeil}<p class="feil">{loginFeil}</p>{/if}
    </div>

    <div class="flor flor-baixo-direita">
      <div class="petala petala-1"></div>
      <div class="petala petala-2"></div>
      <div class="petala petala-3"></div>
    </div>
  </div>
{:else}
  <div class="app">
    <aside class="sidebar">
      <div class="sok-boks">
        <input bind:value={sok} placeholder="Search user" />
      </div>

      <div
        class="generelt-knapp"
        class:aktiv={valgtMottaker === null && !perfilAberto}
        role="button"
        tabindex="0"
        onclick={velgGenerelt}
        onkeydown={(e) => e.key === "Enter" && velgGenerelt()}
      >
        GENERAL CHAT
      </div>

      <div class="brukerliste-tittel">ALL USERS</div>
      <div class="brukerliste">
        {#each brukereFiltrert as bruker}
          <div
            class="bruker-rad"
            class:aktiv={valgtMottaker === bruker.brukernavn}
            role="button"
            tabindex="0"
            onclick={() => bruker.brukernavn !== megSelv && velgBruker(bruker.brukernavn)}
            onkeydown={(e) => e.key === "Enter" && bruker.brukernavn !== megSelv && velgBruker(bruker.brukernavn)}
          >
            <div
              class="avatar"
              style="background:{bruker.farge}"
              role="button"
              tabindex="0"
              onclick={(e) => abrirPerfil(bruker, e)}
              onkeydown={(e) => e.key === "Enter" && abrirPerfil(bruker, e)}
            ></div>
            <div>
              <div class="bruker-navn">
                {bruker.brukernavn}{bruker.brukernavn === megSelv ? " (deg)" : ""}
              </div>
              <div class="bruker-id">id: {bruker.id}</div>
            </div>
          </div>
        {/each}
      </div>
    </aside>

    <main class="chat">
      {#if perfilAberto}
        <header class="chat-header">
          Perfil
          <button class="logg-ut" onclick={fecharPerfil}>Fechar</button>
        </header>

        <div class="perfil-area">
          <div class="perfil-avatar" style="background:{perfilAberto.farge}"></div>
          <div class="perfil-nome">{perfilAberto.brukernavn}</div>
          <div class="perfil-id">id: {perfilAberto.id}</div>
        </div>
      {:else}
        <header class="chat-header">
          {#if valgtMottaker}
            {valgtMottaker}
          {:else}
            GENERAL CHAT
          {/if}
          <button class="logg-ut" onclick={loggUt}>Logg ut</button>
        </header>

        <section class="meldinger-liste">
          {#each meldinger as melding (melding.id)}
            <div class="boble" class:egen={melding.avsender === megSelv}>
              {#if melding.avsender !== megSelv}
                <div class="boble-navn">{melding.avsender}</div>
              {/if}
              <div class="boble-tekst">{melding.tekst}</div>
              <div class="boble-tid">
                {new Date(melding.opprettet).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          {:else}
            <p class="tom">Ingen meldinger ennå.</p>
          {/each}
        </section>

        <p class="status" role="status">{status}</p>

        <div class="input-bar">
          <input
            bind:value={tekst}
            placeholder="Skriv en melding..."
            onkeydown={(e) => e.key === "Enter" && sendMelding()}
          />
          <button onclick={sendMelding}>Send</button>
        </div>
      {/if}
    </main>
  </div>
{/if}
