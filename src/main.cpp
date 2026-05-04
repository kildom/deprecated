#include <botan/auto_rng.h>
#include <botan/cipher_mode.h>
#include <botan/aead.h>
#include <botan/hex.h>
#include <botan/rng.h>

#include <iostream>

int main() {
   Botan::AutoSeeded_RNG rng;

   const std::string plaintext(
      "Your great-grandfather gave this watch to your granddad for good "
      "luck. Unfortunately, Dane's luck wasn't as good as his old man's.");
   const Botan::secure_vector<uint8_t> key = Botan::hex_decode_locked("2B7E151628AED2A6ABF7158809CF4F3C");

   const auto enc = Botan::AEAD_Mode::create_or_throw("AES-128/GCM(12)", Botan::Cipher_Dir::Encryption);
   enc->set_key(key);

   // generate fresh nonce (IV)
   const auto iv = rng.random_vec<std::vector<uint8_t>>(8);

   // Copy input data to a buffer that will be encrypted
   Botan::secure_vector<uint8_t> pt(plaintext.data(), plaintext.data() + plaintext.length());

   uint64_t nonceCounter = 1;

   enc->start((uint8_t*)&nonceCounter, sizeof(nonceCounter));
   enc->finish(pt);

   std::cout << enc->name() << " with iv " << Botan::hex_encode(iv) << " " << Botan::hex_encode(pt) << '\n';
   return 0;
}