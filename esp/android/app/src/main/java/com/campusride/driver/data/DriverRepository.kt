package com.campusride.driver.data

import com.campusride.driver.BuildConfig
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class DriverRepository(val tokens: TokenStore) {
    val api: DriverApi = Retrofit.Builder().baseUrl(BuildConfig.API_BASE_URL)
        .client(OkHttpClient.Builder().connectTimeout(10, TimeUnit.SECONDS).readTimeout(10, TimeUnit.SECONDS)
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                tokens.read()?.let { request.header("Authorization", "Bearer $it") }
                chain.proceed(request.build())
            }.build())
        .addConverterFactory(GsonConverterFactory.create()).build().create(DriverApi::class.java)

    suspend fun login(id: String, password: String): AssignmentResponse {
        val login = api.login(LoginRequest(id.trim(), password))
        tokens.save(login.token)
        return api.assignment()
    }
}