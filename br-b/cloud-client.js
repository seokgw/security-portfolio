"use strict";
window.createBRBCloud = async function (onAuthChange) {
  if (location.protocol === "file:") return null;
  const config = window.BRB_CONFIG;
  if (!config?.url || !config?.publishableKey) return null;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url) || !config.publishableKey.startsWith("sb_publishable_")) {
    throw new Error("DB 공개 설정을 확인해야 합니다.");
  }
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm");
  const client = createClient(config.url, config.publishableKey, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  client.auth.onAuthStateChange((_event, session) => {
    // Run DB calls outside the SDK's synchronous auth callback.
    setTimeout(() => onAuthChange(session?.user ?? null), 0);
  });
  async function requireUser() {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new Error("GitHub로 로그인한 뒤 다시 시도해 주세요.");
    return data.user;
  }
  return {
    async login() {
      const redirectTo = location.origin + location.pathname;
      const { error } = await client.auth.signInWithOAuth({ provider: "github", options: { redirectTo } });
      if (error) throw new Error("GitHub 로그인 연결에 실패했습니다. 잠시 뒤 다시 시도해 주세요.");
    },
    async logout() {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw new Error("로그아웃하지 못했습니다. 다시 시도해 주세요.");
    },
    async list() {
      const user = await requireUser();
      const { data, error } = await client.from("brb_daily_records").select("payload,updated_at")
        .eq("user_id", user.id).order("record_date", { ascending: true });
      if (error) throw new Error("DB 기록을 불러오지 못했습니다. 연결 상태를 확인한 뒤 다시 불러오세요.");
      return data.map(row => ({ ...row.payload, updatedAt: row.updated_at }));
    },
    async save(record, expectedUpdatedAt) {
      const user = await requireUser();
      const row = { user_id: user.id, record_date: record.date, payload: record };
      if (expectedUpdatedAt) {
        const { data, error } = await client.from("brb_daily_records").update(row)
          .eq("user_id", user.id).eq("record_date", record.date).eq("updated_at", expectedUpdatedAt)
          .select("updated_at");
        if (error) throw new Error("DB에 저장하지 못했습니다. 입력은 화면에 남아 있습니다. 다시 시도해 주세요.");
        if (!data.length) throw new Error("다른 화면에서 이 날짜의 기록이 변경됐습니다. 기록을 다시 불러온 뒤 수정해 주세요.");
        return data[0].updated_at;
      }
      const { data, error } = await client.from("brb_daily_records").insert(row).select("updated_at").single();
      if (error?.code === "23505") throw new Error("이 날짜의 기록이 이미 저장돼 있습니다. 기록을 다시 불러온 뒤 수정해 주세요.");
      if (error) throw new Error("DB에 저장하지 못했습니다. 입력은 화면에 남아 있습니다. 다시 시도해 주세요.");
      return data.updated_at;
    }
  };
};
