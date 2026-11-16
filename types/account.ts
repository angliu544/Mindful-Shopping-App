/** The signed-in user's account, as shown on the account settings page. */
export interface AccountDTO {
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface AccountResponse {
  account: AccountDTO;
}
