import { createAuthClient } from 'better-auth/react'
import { adminClient } from 'better-auth/client/plugins'
import { ac, admin, user, member, seller } from '@/lib/permissions'
import { env } from '@/config/env'

export const authClient = createAuthClient({
    baseURL: env.NEXT_PUBLIC_APP_URL,
    plugins: [
        adminClient({
            ac,
            roles: {
                admin,
                user,
                member,
                seller
            },
        }),
    ],
})

export const signIn = async () => {
    const data = await authClient.signIn.social({
        provider: 'google',
    })
}

export const { signUp, signOut, useSession } = authClient
