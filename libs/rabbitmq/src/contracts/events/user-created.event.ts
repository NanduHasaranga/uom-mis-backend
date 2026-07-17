export interface UserCreatedEvent {
    userId: string;
    username: string;
    email: string;
    fullName?: string;
    createdAt: string;
}