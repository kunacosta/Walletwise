export async function tryAddWhileSignedOut(): Promise<string> {
  try {
    // intentionally try to write without auth
    const { getFirestore, collection, addDoc } = await import("firebase/firestore");
    const { app } = await import("./firebase");
    const db = getFirestore(app);
    await addDoc(collection(db, "users", "FAKE", "transactions"), { ok: true, at: new Date() });
    return "unexpected-success";
  } catch (e: any) {
    return e?.code || e?.message || "error";
  }
}
