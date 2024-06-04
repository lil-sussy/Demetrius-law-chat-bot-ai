// Login.tsx
import React, { useState, useEffect } from "react";
import { loginRequest, authenticationRequest, logout } from "../../requests/request";
import { setCookie } from '../../requests/request';
import { SidePanelCloseFilled, Download } from "@carbon/icons-react";
import { Form, TextInput, TextInputSkeleton, Button, Theme, Search } from "@carbon/react";

import "./loginPage.scss";

interface LoginProps {
	setLoggedin: (loggedin: boolean) => void;
	setUsername: (username: string) => void;
	setUserPriviliges: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ setUserPriviliges, setLoggedin, setUsername }) => {
	const [username, setInputUsername] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");

	const onChangeUsername = (e: React.ChangeEvent<HTMLInputElement>) => {
		const username = e.target.value;
		setInputUsername(username);
	};

	const onChangePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
		const password = e.target.value;
		setPassword(password);
	};

	const handleLogin = (e: React.FormEvent) => {
		e.preventDefault();

		setMessage("");
		setLoading(true);

		loginRequest(username, password).then(
			(response) => {
        // navigate("/profile");
				setMessage(response.message);
        setUserPriviliges(response.account.privileges);
				setUsername(response.account.username);
				setLoggedin(true);
			},
			(error) => {
				const resMessage = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();

				setLoading(false);
				setMessage(resMessage);
			}
		);
	};

	authenticationRequest()
		.then((response) => {
			setUsername(response.account.username);
			setUserPriviliges(response.account.privileges);
			setLoggedin(true);
		})
		.catch((err) => {
			console.log(err);
		});
	useEffect(() => {}, []);

	return (
		<div className="login-container">
			<div className="card card-container">
				{/* Add your form HTML here */}
				<Form className="login-form" onSubmit={handleLogin}>
					{/* Add your form fields here */}
					<TextInput className="login-input" labelText="Username" type="text" id="username" required value={username} onChange={onChangeUsername} />
					<TextInput className="login-input" labelText="Password" type="password" id="password" required value={password} onChange={onChangePassword} />
					<Button disabled={loading} onClick={handleLogin}>
						{loading && <span>Loading...</span>}
						<span>Login</span>
					</Button>

					{message && (
						<div>
							<div>{message}</div>
						</div>
					)}
				</Form>
			</div>
		</div>
	);
};

export default Login;
