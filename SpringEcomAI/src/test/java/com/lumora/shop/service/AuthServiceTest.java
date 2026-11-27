package com.lumora.shop.service;

import com.lumora.shop.exception.EmailAlreadyUsedException;
import com.lumora.shop.model.AppUser;
import com.lumora.shop.model.Role;
import com.lumora.shop.model.dto.AuthResponse;
import com.lumora.shop.model.dto.LoginRequest;
import com.lumora.shop.model.dto.RegisterRequest;
import com.lumora.shop.repo.UserRepo;
import com.lumora.shop.security.JwtService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private final UserRepo userRepo = mock(UserRepo.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final JwtService jwt = new JwtService("", 60_000);
    private final AuthService service = new AuthService(userRepo, encoder, jwt);

    @Test
    void registerHashesPasswordNormalizesEmailAndAlwaysCreatesUser() {
        when(userRepo.existsByEmail("a@b.com")).thenReturn(false);
        when(userRepo.save(any(AppUser.class))).thenAnswer(i -> i.getArgument(0));

        AuthResponse res = service.register(new RegisterRequest(" Asha ", "  A@B.com ", "supersecret1"));

        ArgumentCaptor<AppUser> saved = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepo).save(saved.capture());
        assertThat(saved.getValue().getEmail()).isEqualTo("a@b.com");
        assertThat(saved.getValue().getRole()).isEqualTo(Role.USER);
        assertThat(saved.getValue().getPasswordHash()).isNotEqualTo("supersecret1");
        assertThat(encoder.matches("supersecret1", saved.getValue().getPasswordHash())).isTrue();
        assertThat(res.role()).isEqualTo("USER");
        assertThat(jwt.parse(res.token()).getSubject()).isEqualTo("a@b.com");
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(userRepo.existsByEmail("a@b.com")).thenReturn(true);
        assertThatThrownBy(() -> service.register(new RegisterRequest("Asha", "a@b.com", "supersecret1")))
                .isInstanceOf(EmailAlreadyUsedException.class);
        verify(userRepo, never()).save(any());
    }

    @Test
    void loginSucceedsWithCorrectPassword() {
        AppUser u = AppUser.builder().email("a@b.com").fullName("Asha")
                .passwordHash(encoder.encode("supersecret1")).role(Role.ADMIN).build();
        when(userRepo.findByEmail("a@b.com")).thenReturn(Optional.of(u));

        AuthResponse res = service.login(new LoginRequest("A@B.com", "supersecret1"));
        assertThat(res.role()).isEqualTo("ADMIN");
        assertThat(jwt.parse(res.token()).get("role", String.class)).isEqualTo("ADMIN");
    }

    @Test
    void wrongPasswordAndUnknownEmailGiveTheSameError() {
        AppUser u = AppUser.builder().email("a@b.com").passwordHash(encoder.encode("supersecret1")).role(Role.USER).build();
        when(userRepo.findByEmail("a@b.com")).thenReturn(Optional.of(u));
        when(userRepo.findByEmail("nobody@b.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login(new LoginRequest("a@b.com", "wrong-password")))
                .isInstanceOf(BadCredentialsException.class).hasMessage("Invalid email or password");
        assertThatThrownBy(() -> service.login(new LoginRequest("nobody@b.com", "whatever123")))
                .isInstanceOf(BadCredentialsException.class).hasMessage("Invalid email or password");
    }
}
